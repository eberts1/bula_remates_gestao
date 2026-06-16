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
import { AuditService } from '../audit/audit.service';
import { clientOwnerScope } from '../common/client-owner-scope.util';
import { normalizeLegacyCode } from './parsers/pdf-etb-estancia.parser';
import { sanitizeImportEmail } from './parsers/email.util';
import { parseImportFile, type ColumnMapping } from './parsers/parser.registry';
import { normalizePhone } from './parsers/phone.util';

/** Evita timeout do Prisma/Neon em importações grandes (ex.: PDF 200+ linhas). */
const IMPORT_COMMIT_CHUNK_SIZE = 25;

function formatImportCommitValidationError(error: {
  issues: Array<{ path: (string | number)[]; message: string }>;
}): string {
  const issue = error.issues[0];
  if (!issue) return 'Dados de importação inválidos';
  const rowIdx = issue.path[0] === 'rows' ? issue.path[1] : undefined;
  const field =
    issue.path[0] === 'rows'
      ? issue.path.slice(2).join('.')
      : issue.path.join('.');
  const parts: string[] = ['Dados de importação inválidos'];
  if (typeof rowIdx === 'number') parts.push(`(item ${rowIdx + 1} do lote)`);
  if (field) parts.push(`campo ${field}`);
  return `${parts.join(' ')}: ${issue.message}`;
}

function sanitizeCommitRowPhones(row: Record<string, unknown>): Record<string, unknown> {
  const phone = normalizePhone(
    typeof row.phone === 'string' ? row.phone : null,
  );
  const property =
    row.property && typeof row.property === 'object'
      ? (row.property as Record<string, unknown>)
      : null;
  const additionalProperties = Array.isArray(row.additionalProperties)
    ? row.additionalProperties
    : null;

  return {
    ...row,
    phone,
    ...(property
      ? {
          property: {
            ...property,
            phone:
              normalizePhone(
                typeof property.phone === 'string' ? property.phone : null,
              ) ?? undefined,
          },
        }
      : {}),
    ...(additionalProperties
      ? {
          additionalProperties: additionalProperties.map((p) => {
            if (!p || typeof p !== 'object') return p;
            const prop = p as Record<string, unknown>;
            return {
              ...prop,
              phone:
                normalizePhone(
                  typeof prop.phone === 'string' ? prop.phone : null,
                ) ?? undefined,
            };
          }),
        }
      : {}),
  };
}

function sanitizeCommitPayload(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  const payload = body as { rows?: unknown[] };
  if (!Array.isArray(payload.rows)) return body;
  return {
    ...payload,
    rows: payload.rows.map((row) => {
      if (!row || typeof row !== 'object') return row;
      const r = row as Record<string, unknown>;
      return sanitizeCommitRowPhones({
        ...r,
        email: sanitizeImportEmail(
          typeof r.email === 'string' ? r.email : null,
        ),
      });
    }),
  };
}

export interface ImportConflict {
  clientId: string;
  matchReason:
    | 'legacy_code'
    | 'document'
    | 'email'
    | 'phone'
    | 'name_city';
  existing: {
    id: string;
    name: string;
    document: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    legacyCode: string | null;
  };
}

interface ConflictCache {
  byLegacyCode: Map<string, ImportConflict>;
  byEmail: Map<string, ImportConflict>;
  byDocument: Map<string, ImportConflict>;
  byPhone: Map<string, ImportConflict>;
  byNameCity: Map<string, ImportConflict>;
}

@Injectable()
export class ClientImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clientsService: ClientsService,
    private readonly audit: AuditService,
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

    let parsed: Awaited<ReturnType<typeof parseImportFile>>;
    try {
      parsed = await parseImportFile(
        file.buffer,
        name,
        mime,
        columnMapping,
      );
    } catch (e) {
      throw new BadRequestException(
        e instanceof Error ? e.message : 'Formato não suportado. Use PDF, XLS ou XLSX.',
      );
    }

    const cache = await this.buildConflictCache(user);

    const rowsWithConflicts = parsed.rows.map((row) => {
      const email = sanitizeImportEmail(row.email);
      const conflict = this.findConflictCached(cache, {
        name: row.name,
        document: row.document,
        phone: row.phone,
        email,
        city: row.property.city,
        legacyCode: row.legacyCode,
        groupKey: row.groupKey,
      });
      return {
        ...row,
        email,
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
    });

    return {
      fileName: name,
      mimeType: mime,
      sourceType: parsed.meta.parserId,
      sourceLabel: parsed.meta.sourceLabel,
      suggestedTags: parsed.meta.suggestedTags,
      columnMapping: parsed.meta.columnMapping,
      rows: rowsWithConflicts,
      total: rowsWithConflicts.length,
    };
  }

  async commit(user: JwtPayload, body: unknown) {
    const sanitizedBody = sanitizeCommitPayload(body);
    const parsed = importCommitSchema.safeParse(sanitizedBody);
    if (!parsed.success) {
      throw new BadRequestException(
        formatImportCommitValidationError(parsed.error),
      );
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
      void this.audit.log({
        tenantId: user.tenantId,
        userId: user.sub,
        actorEmail: user.email,
        action: 'client_import.commit',
        entityType: 'client_import_batch',
        summary: `Importação "${fileName}": ${batchSummary.importedCount} novos, ${batchSummary.updatedCount} atualizados, ${batchSummary.skippedCount} ignorados`,
        metadata: {
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
    const groupClientIds = new Map<string, string>();

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
                groupClientIds,
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

    void this.audit.log({
      tenantId: user.tenantId,
      userId: user.sub,
      actorEmail: user.email,
      action: 'client_import.commit',
      entityType: 'client_import_batch',
      summary: `Importação "${fileName}": ${importedCount} novos, ${updatedCount} atualizados, ${skippedCount} ignorados`,
      metadata: {
        fileName,
        mimeType,
        sourceType,
        rowCount: toProcess.length,
        importedCount,
        updatedCount,
        skippedCount,
      },
    });

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
    groupClientIds: Map<string, string>,
  ): Promise<{ imported: number; updated: number; skipped: number }> {
    const resolution = row.resolution ?? 'create';
    const groupKey = row.groupKey?.trim();

    if (resolution === 'skip') {
      return { imported: 0, updated: 0, skipped: 1 };
    }

    if (groupKey && groupClientIds.has(groupKey)) {
      const clientId = groupClientIds.get(groupKey)!;
      await this.appendImportProperties(tx, user.tenantId, clientId, row);
      return { imported: 0, updated: 0, skipped: 0 };
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

    const legacyNorm = row.legacyCode
      ? normalizeLegacyCode(row.legacyCode)
      : null;

    if (resolution === 'update') {
      let targetId = row.conflictClientId;
      if (!targetId && groupKey) {
        targetId = groupClientIds.get(groupKey);
      }
      if (!targetId) {
        targetId = (
          await this.findConflict(user, {
            name: row.name,
            document: row.document ?? null,
            phone: row.phone ?? null,
            email: row.email ?? null,
            city: row.property.city,
            legacyCode: row.legacyCode ?? null,
            groupKey: row.groupKey ?? null,
          })
        )?.clientId;
      }
      if (!targetId) {
        return { imported: 0, updated: 0, skipped: 1 };
      }
      const owned = await tx.client.findFirst({
        where: {
          id: targetId,
          tenantId: user.tenantId,
          deletedAt: null,
          ...clientOwnerScope(user),
        },
        select: { id: true },
      });
      if (!owned) {
        return { imported: 0, updated: 0, skipped: 1 };
      }
      await tx.client.update({
        where: { id: targetId },
        data: {
          ...(row.phone ? { phone: row.phone } : {}),
          ...(row.email ? { email: row.email } : {}),
          ...(row.notes ? { notes: row.notes } : {}),
          ...(legacyNorm
            ? { legacyCode: legacyNorm }
            : row.legacyCode
              ? { legacyCode: row.legacyCode }
              : {}),
          ...tagData,
        },
      });
      await this.appendImportProperties(tx, user.tenantId, targetId, row);
      await this.clientsService.syncClientIntentions(tx, targetId, intentionIds);
      if (groupKey) groupClientIds.set(groupKey, targetId);
      return { imported: 0, updated: 1, skipped: 0 };
    }

    if (resolution === 'create' && groupKey && groupClientIds.has(groupKey)) {
      const clientId = groupClientIds.get(groupKey)!;
      await this.appendImportProperties(tx, user.tenantId, clientId, row);
      return { imported: 0, updated: 0, skipped: 0 };
    }

    const created = await tx.client.create({
      data: {
        tenantId: user.tenantId,
        ownerId: user.sub,
        name: row.name,
        document: row.document?.trim() || null,
        legacyCode: legacyNorm || row.legacyCode?.trim() || null,
        email: row.email || null,
        phone: row.phone ?? null,
        notes: row.notes ?? null,
        ...tagData,
      },
    });
    await this.appendImportProperties(tx, user.tenantId, created.id, row, true);
    await this.clientsService.syncClientIntentions(tx, created.id, intentionIds);
    if (groupKey) groupClientIds.set(groupKey, created.id);
    return { imported: 1, updated: 0, skipped: 0 };
  }

  private async appendImportProperties(
    tx: Prisma.TransactionClient,
    tenantId: string,
    clientId: string,
    row: ImportCommitRow,
    primaryAlreadyCreated = false,
  ): Promise<void> {
    if (!primaryAlreadyCreated) {
      await this.clientsService.appendPropertyIfNotExists(
        tx,
        tenantId,
        clientId,
        row.property,
      );
    } else {
      await tx.clientProperty.create({
        data: {
          clientId,
          tenantId,
          farmName: row.property.farmName || '—',
          city: row.property.city || '—',
          state: row.property.state.toUpperCase(),
          phone: row.property.phone ?? null,
          routeNotes: row.property.routeNotes ?? null,
          sortOrder: 0,
        },
      });
    }

    const extras = row.additionalProperties ?? [];
    for (let i = 0; i < extras.length; i++) {
      await this.clientsService.appendPropertyIfNotExists(
        tx,
        tenantId,
        clientId,
        {
          ...extras[i],
          routeNotes:
            extras[i].routeNotes ??
            `${extras[i].farmName} - ${extras[i].city} ${extras[i].state}`,
        },
      );
    }
  }

  private normalizeEmail(email: string | null | undefined): string | null {
    if (!email?.trim()) return null;
    return email.trim().toLowerCase();
  }

  async buildConflictCache(user: JwtPayload): Promise<ConflictCache> {
    const clients = await this.prisma.client.findMany({
      where: {
        tenantId: user.tenantId,
        deletedAt: null,
        ...clientOwnerScope(user),
      },
      select: {
        id: true,
        name: true,
        document: true,
        phone: true,
        email: true,
        legacyCode: true,
        properties: { take: 1, orderBy: { sortOrder: 'asc' } },
      },
    });

    const cache: ConflictCache = {
      byLegacyCode: new Map(),
      byEmail: new Map(),
      byDocument: new Map(),
      byPhone: new Map(),
      byNameCity: new Map(),
    };

    for (const c of clients) {
      const conflict = this.clientToConflict(c, 'legacy_code');
      if (c.legacyCode) {
        const norm = normalizeLegacyCode(c.legacyCode);
        if (norm && !cache.byLegacyCode.has(norm)) {
          cache.byLegacyCode.set(norm, { ...conflict, matchReason: 'legacy_code' });
        }
      }
      const email = this.normalizeEmail(c.email);
      if (email && !cache.byEmail.has(email)) {
        cache.byEmail.set(email, { ...conflict, matchReason: 'email' });
      }
      if (c.document) {
        const doc = c.document.replace(/\D/g, '');
        if (doc && !cache.byDocument.has(doc)) {
          cache.byDocument.set(doc, { ...conflict, matchReason: 'document' });
        }
      }
      const phone = normalizePhone(c.phone);
      if (phone && !cache.byPhone.has(phone)) {
        cache.byPhone.set(phone, { ...conflict, matchReason: 'phone' });
      }
      const city = c.properties[0]?.city?.trim().toLowerCase();
      if (city) {
        const key = `${c.name.trim().toLowerCase()}|${city}`;
        if (!cache.byNameCity.has(key)) {
          cache.byNameCity.set(key, { ...conflict, matchReason: 'name_city' });
        }
      }
    }

    return cache;
  }

  findConflictCached(
    cache: ConflictCache,
    row: {
      name: string;
      document: string | null;
      phone: string | null;
      email: string | null;
      city: string;
      legacyCode: string | null;
      groupKey: string | null;
    },
  ): ImportConflict | null {
    const code = row.legacyCode
      ? normalizeLegacyCode(row.legacyCode)
      : row.groupKey?.trim() || null;
    if (code) {
      const hit = cache.byLegacyCode.get(code);
      if (hit) return hit;
    }

    if (row.document?.trim()) {
      const doc = row.document.replace(/\D/g, '');
      const hit = cache.byDocument.get(doc);
      if (hit) return hit;
    }

    const email = this.normalizeEmail(row.email);
    if (email) {
      const hit = cache.byEmail.get(email);
      if (hit) return hit;
    }

    const phone = normalizePhone(row.phone);
    if (phone) {
      const hit = cache.byPhone.get(phone);
      if (hit) return hit;
    }

    const cityNorm = row.city.trim().toLowerCase();
    if (row.name.trim() && cityNorm) {
      const key = `${row.name.trim().toLowerCase()}|${cityNorm}`;
      const hit = cache.byNameCity.get(key);
      if (hit) return hit;
    }

    return null;
  }

  async findConflict(
    user: JwtPayload,
    row: {
      name: string;
      document: string | null;
      phone: string | null;
      email: string | null;
      city: string;
      legacyCode: string | null;
      groupKey: string | null;
    },
  ): Promise<ImportConflict | null> {
    const cache = await this.buildConflictCache(user);
    return this.findConflictCached(cache, row);
  }

  private clientToConflict(
    client: {
      id: string;
      name: string;
      document: string | null;
      phone: string | null;
      email: string | null;
      legacyCode: string | null;
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
        email: client.email,
        legacyCode: client.legacyCode,
        city: client.properties[0]?.city ?? null,
      },
    };
  }

}
