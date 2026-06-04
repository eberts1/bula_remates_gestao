import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import type { ImportCommitRow, ImportSourceHints } from '@docs/shared';
import { importCommitSchema } from '@docs/shared';
import { Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/auth.types';
import { ClientsService } from '../clients/clients.service';
import { PrismaService } from '../prisma/prisma.service';
import { parsePdfTouroMt } from './parsers/pdf-touro-mt.parser';
import { parseSpreadsheet, type ColumnMapping } from './parsers/spreadsheet.parser';
import { normalizePhone } from './parsers/phone.util';

/** Evita timeout do Prisma/Neon em importações grandes (ex.: PDF 200+ linhas). */
const IMPORT_COMMIT_CHUNK_SIZE = 25;

export interface ImportConflict {
  clientId: string;
  matchReason: 'document' | 'phone' | 'name_city';
  existing: {
    id: string;
    name: string;
    document: string | null;
    phone: string | null;
    city: string | null;
  };
}

@Injectable()
export class ClientImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
  ) {}

  async parseFile(
    user: JwtPayload,
    file: Express.Multer.File,
    sourceHintsJson?: string,
    columnMappingJson?: string,
  ) {
    const sourceHints: ImportSourceHints = sourceHintsJson
      ? (JSON.parse(sourceHintsJson) as ImportSourceHints)
      : {};

    let columnMapping: ColumnMapping | undefined;
    if (columnMappingJson) {
      columnMapping = JSON.parse(columnMappingJson) as ColumnMapping;
    }

    const mime = file.mimetype;
    const name = file.originalname;
    let parsed: Awaited<ReturnType<typeof parsePdfTouroMt>>;

    if (mime === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
      parsed = await parsePdfTouroMt(file.buffer, name);
    } else if (
      mime.includes('spreadsheet') ||
      mime.includes('excel') ||
      /\.xlsx?$/i.test(name)
    ) {
      parsed = parseSpreadsheet(file.buffer, name, columnMapping);
    } else {
      throw new BadRequestException(
        'Formato não suportado. Use PDF, XLS ou XLSX.',
      );
    }

    const rowsWithConflicts = await Promise.all(
      parsed.rows.map(async (row) => {
        const conflict = await this.findConflict(user.tenantId, {
          name: row.name,
          document: row.document,
          phone: row.phone,
          city: row.property.city,
        });
        return {
          ...row,
          animalType: sourceHints.animalType ?? null,
          animalSex: sourceHints.animalSex ?? null,
          livestockCategory:
            sourceHints.livestockCategory ??
            parsed.meta.suggestedTags.livestockCategory ??
            null,
          intentionIds: sourceHints.intentionIds ?? [],
          intentionNotes: sourceHints.intentionNotes ?? null,
          conflict,
        };
      }),
    );

    const sheetMeta =
      parsed.meta.parserId === 'spreadsheet'
        ? (parsed as ReturnType<typeof parseSpreadsheet>).meta
        : null;

    return {
      fileName: name,
      mimeType: mime,
      sourceType: parsed.meta.parserId,
      suggestedTags: parsed.meta.suggestedTags,
      columnMapping: sheetMeta?.columnMapping,
      rows: rowsWithConflicts,
      total: rowsWithConflicts.length,
    };
  }

  async commit(user: JwtPayload, body: unknown) {
    const parsed = importCommitSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }

    const { fileName, mimeType, sourceType, rows, batchSummary } = parsed.data;
    const toProcess = rows.filter((r) => r.selected !== false);

    if (toProcess.length === 0 && batchSummary) {
      await this.prisma.clientImportBatch.create({
        data: {
          tenantId: user.tenantId,
          createdById: user.sub,
          fileName,
          mimeType,
          sourceType,
          rowCount: batchSummary.rowCount,
          importedCount: batchSummary.importedCount,
          updatedCount: batchSummary.updatedCount,
          skippedCount: batchSummary.skippedCount,
        },
      });
      return {
        importedCount: batchSummary.importedCount,
        updatedCount: batchSummary.updatedCount,
        skippedCount: batchSummary.skippedCount,
      };
    }

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    const validIntentionIds = await this.getTenantIntentionIdSet(user.tenantId);

    try {
      for (let i = 0; i < toProcess.length; i += IMPORT_COMMIT_CHUNK_SIZE) {
        const chunk = toProcess.slice(i, i + IMPORT_COMMIT_CHUNK_SIZE);
        const partial = await this.prisma.$transaction(
          async (tx) => {
            let imp = 0;
            let upd = 0;
            let skip = 0;
            for (const row of chunk) {
              const result = await this.processImportRow(
                tx,
                user,
                row,
                validIntentionIds,
              );
              imp += result.imported;
              upd += result.updated;
              skip += result.skipped;
            }
            return { imported: imp, updated: upd, skipped: skip };
          },
          { maxWait: 15_000, timeout: 120_000 },
        );
        importedCount += partial.imported;
        updatedCount += partial.updated;
        skippedCount += partial.skipped;
      }

      if (!batchSummary) {
        await this.prisma.clientImportBatch.create({
          data: {
            tenantId: user.tenantId,
            createdById: user.sub,
            fileName,
            mimeType,
            sourceType,
            rowCount: toProcess.length,
            importedCount,
            updatedCount,
            skippedCount,
          },
        });
      }
    } catch (e) {
      const detail =
        e instanceof Error ? e.message : 'erro desconhecido ao gravar no banco';
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        throw new BadRequestException(
          `Falha ao importar (linha ~${importedCount + updatedCount + skippedCount + 1}): ${detail}`,
        );
      }
      throw new InternalServerErrorException(
        `Falha ao importar: ${detail}`,
      );
    }

    return { importedCount, updatedCount, skippedCount };
  }

  private async getTenantIntentionIdSet(tenantId: string): Promise<Set<string>> {
    const items = await this.prisma.tenantIntention.findMany({
      where: { tenantId, active: true },
      select: { id: true },
    });
    return new Set(items.map((i) => i.id));
  }

  private async processImportRow(
    tx: Prisma.TransactionClient,
    user: JwtPayload,
    row: ImportCommitRow,
    validIntentionIds: Set<string>,
  ): Promise<{ imported: number; updated: number; skipped: number }> {
    const resolution = row.resolution ?? 'create';

    if (resolution === 'skip') {
      return { imported: 0, updated: 0, skipped: 1 };
    }

    const intentionIds = (row.intentionIds ?? []).filter((id) =>
      validIntentionIds.has(id),
    );

    const tagData = {
      animalType: row.animalType ?? null,
      animalSex: row.animalSex ?? null,
      livestockCategory: row.livestockCategory ?? null,
      intentionNotes: row.intentionNotes ?? null,
    };

    if (resolution === 'update') {
      const targetId =
        row.conflictClientId ??
        (
          await this.findConflict(user.tenantId, {
            name: row.name,
            document: row.document ?? null,
            phone: row.phone ?? null,
            city: row.property.city,
          })
        )?.clientId;
      if (!targetId) {
        return { imported: 0, updated: 0, skipped: 1 };
      }
      await tx.client.update({
        where: { id: targetId },
        data: {
          ...(row.phone ? { phone: row.phone } : {}),
          ...(row.notes ? { notes: row.notes } : {}),
          ...tagData,
        },
      });
      await this.clientsService.appendPropertyIfNotExists(
        tx,
        user.tenantId,
        targetId,
        row.property,
      );
      await this.clientsService.syncClientIntentions(tx, targetId, intentionIds);
      return { imported: 0, updated: 1, skipped: 0 };
    }

    const created = await tx.client.create({
      data: {
        tenantId: user.tenantId,
        name: row.name,
        document: row.document?.trim() || null,
        email: row.email || null,
        phone: row.phone ?? null,
        notes: row.notes ?? null,
        ...tagData,
      },
    });
    await tx.clientProperty.create({
      data: {
        clientId: created.id,
        tenantId: user.tenantId,
        farmName: row.property.farmName,
        city: row.property.city,
        state: row.property.state.toUpperCase(),
        phone: row.property.phone ?? null,
        sortOrder: 0,
      },
    });
    await this.clientsService.syncClientIntentions(tx, created.id, intentionIds);
    return { imported: 1, updated: 0, skipped: 0 };
  }

  async findConflict(
    tenantId: string,
    row: {
      name: string;
      document: string | null;
      phone: string | null;
      city: string;
    },
  ): Promise<ImportConflict | null> {
    if (row.document?.trim()) {
      const doc = row.document.replace(/\D/g, '');
      const byDoc = await this.prisma.client.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          document: { contains: doc },
        },
        include: { properties: { take: 1, orderBy: { sortOrder: 'asc' } } },
      });
      if (byDoc) {
        return this.toConflict(byDoc, 'document');
      }
    }

    const phone = normalizePhone(row.phone);
    if (phone) {
      const clients = await this.prisma.client.findMany({
        where: { tenantId, deletedAt: null, phone: { not: null } },
        include: { properties: { take: 1, orderBy: { sortOrder: 'asc' } } },
        take: 500,
      });
      const byPhone = clients.find(
        (c) => normalizePhone(c.phone) === phone,
      );
      if (byPhone) {
        return this.toConflict(byPhone, 'phone');
      }
    }

    const cityNorm = row.city.trim().toLowerCase();
    if (row.name.trim() && cityNorm) {
      const byName = await this.prisma.client.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          name: { equals: row.name.trim(), mode: 'insensitive' },
          properties: {
            some: { city: { equals: row.city.trim(), mode: 'insensitive' } },
          },
        },
        include: { properties: { take: 1, orderBy: { sortOrder: 'asc' } } },
      });
      if (byName) {
        return this.toConflict(byName, 'name_city');
      }
    }

    return null;
  }

  private toConflict(
    client: {
      id: string;
      name: string;
      document: string | null;
      phone: string | null;
      properties: Array<{ city: string }>;
    },
    matchReason: ImportConflict['matchReason'],
  ): ImportConflict {
    return {
      clientId: client.id,
      matchReason,
      existing: {
        id: client.id,
        name: client.name,
        document: client.document,
        phone: client.phone,
        city: client.properties[0]?.city ?? null,
      },
    };
  }
}
