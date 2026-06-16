import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  AUCTION_MATCH_STATUSES,
  auctionImportCommitSchema,
  DEFAULT_AUCTION_SCHEDULE_SHEET_CSV_URL,
  DEFAULT_AUCTION_TARGET_INTENTION,
  detectIsBulaRemates,
} from '@docs/shared';
import { JwtPayload } from '../auth/auth.types';
import { AttendanceService } from '../attendance/attendance.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildAuctionExternalKey,
  DEFAULT_AUCTION_IMPORT_YEAR,
  parseAuctionSpreadsheet,
} from './auction-import.parser';
import { CreateAuctionAttendanceDto } from './dto/create-auction-attendance.dto';
import { CreateAuctionDto } from './dto/create-auction.dto';
import { ImportScheduleDto } from './dto/import-schedule.dto';
import { UpdateAuctionDto } from './dto/update-auction.dto';
import { UpsertAuctionMatchDto } from './dto/upsert-auction-match.dto';

const matchClientInclude = {
  responsible: { select: { id: true, name: true } },
  intentions: {
    include: {
      intention: { select: { id: true, code: true, label: true } },
    },
  },
} satisfies Prisma.ClientInclude;

type MatchClient = Prisma.ClientGetPayload<{ include: typeof matchClientInclude }>;

export interface AuctionMatchClient {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  animalType: string | null;
  animalSex: string | null;
  livestockCategory: string | null;
  responsible: { id: string; name: string } | null;
  intentions: Array<{ id: string; code: string; label: string }>;
  matchSource: string | null;
  matchStatus: string | null;
  matchNotes: string | null;
}

@Injectable()
export class AuctionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
  ) {}

  async list(user: JwtPayload) {
    const items = await this.prisma.auction.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      orderBy: [{ scheduledAt: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: {
            matches: {
              where: { status: 'included', ownerId: user.sub },
            },
          },
        },
      },
    });

    return {
      items: items.map((auction) => this.toListItem(auction)),
    };
  }

  async findOne(user: JwtPayload, id: string) {
    const auction = await this.findAuctionOrThrow(user.tenantId, id);
    const includedCount = await this.prisma.auctionMatch.count({
      where: { auctionId: auction.id, status: 'included', ownerId: user.sub },
    });

    return {
      ...this.toDetail(auction),
      includedCount,
    };
  }

  async create(user: JwtPayload, dto: CreateAuctionDto) {
    const auction = await this.prisma.auction.create({
      data: {
        ...this.buildCreateData(user.tenantId, dto),
        source: 'manual',
        externalKey: dto.scheduledAt
          ? buildAuctionExternalKey(dto.name, dto.scheduledAt)
          : null,
      },
    });

    return this.toDetail(auction);
  }

  async getSchedule(user: JwtPayload) {
    const csvUrl =
      process.env.AUCTION_SCHEDULE_SHEET_CSV_URL ??
      DEFAULT_AUCTION_SCHEDULE_SHEET_CSV_URL;

    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new BadRequestException(
        'Não foi possível carregar a planilha de leilões',
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const year = Number(process.env.AUCTION_SCHEDULE_SHEET_YEAR) ||
      DEFAULT_AUCTION_IMPORT_YEAR;
    const parsed = parseAuctionSpreadsheet(buffer, 'schedule.csv', year);

    const existing = await this.prisma.auction.findMany({
      where: { tenantId: user.tenantId, deletedAt: null, externalKey: { not: null } },
      select: { id: true, externalKey: true },
    });
    const existingByKey = new Map(
      existing.map((item) => [item.externalKey!, item.id]),
    );

    const rows = parsed.rows.map((row) => {
      const externalKey = buildAuctionExternalKey(
        row.name,
        row.scheduledAt,
      );
      const auctionId = existingByKey.get(externalKey) ?? null;

      return {
        rowIndex: row.rowIndex,
        date: row.date,
        dayOfWeek: row.dayOfWeek,
        name: row.name,
        time: row.time,
        scheduledAt: row.scheduledAt,
        animalType: row.animalType,
        animalSex: row.animalSex,
        livestockCategories: row.livestockCategories,
        auctioneer: row.auctioneer,
        isBulaRemates: row.isBulaRemates,
        externalKey,
        alreadyImported: Boolean(auctionId),
        auctionId,
      };
    });

    return {
      rows,
      meta: {
        ...parsed.meta,
        csvUrl,
        importedCount: rows.filter((row) => row.alreadyImported).length,
        pendingCount: rows.filter((row) => !row.alreadyImported).length,
      },
    };
  }

  async importSchedule(user: JwtPayload, dto: ImportScheduleDto) {
    if (!dto.rows.length) {
      throw new BadRequestException('Nenhuma linha selecionada para importar');
    }

    const items = [];
    let skippedCount = 0;

    for (const row of dto.rows) {
      const externalKey =
        row.externalKey ?? buildAuctionExternalKey(row.name, row.scheduledAt ?? null);

      const existing = await this.prisma.auction.findFirst({
        where: {
          tenantId: user.tenantId,
          deletedAt: null,
          externalKey,
        },
      });

      if (existing) {
        skippedCount += 1;
        items.push(this.toDetail(existing));
        continue;
      }

      const auction = await this.prisma.auction.create({
        data: {
          ...this.buildCreateData(user.tenantId, {
            name: row.name.trim(),
            scheduledAt: row.scheduledAt ?? undefined,
            status: 'agendado',
            animalType: row.animalType ?? undefined,
            animalSex: row.animalSex ?? undefined,
            livestockCategories: row.livestockCategories ?? [],
            targetIntentionCode: DEFAULT_AUCTION_TARGET_INTENTION,
            active: true,
            isBulaRemates:
              row.isBulaRemates ??
              detectIsBulaRemates(row.name.trim()),
          }),
          source: 'sheet',
          externalKey,
        },
      });

      items.push(this.toDetail(auction));
    }

    return {
      importedCount: items.length - skippedCount,
      skippedCount,
      items,
    };
  }

  async createAttendanceFromMatch(
    user: JwtPayload,
    auctionId: string,
    dto: CreateAuctionAttendanceDto,
  ) {
    await this.findAuctionOrThrow(user.tenantId, auctionId);
    return this.attendanceService.createActionsForAuction(
      user,
      auctionId,
      dto.clientIds,
    );
  }

  parseImport(buffer: Buffer, fileName: string) {
    return parseAuctionSpreadsheet(buffer, fileName);
  }

  async commitImport(user: JwtPayload, body: unknown) {
    const parsed = auctionImportCommitSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(
        parsed.error.issues.map((issue) => issue.message).join('; ') ||
          'Dados de importação inválidos',
      );
    }

    const selectedRows = parsed.data.rows.filter((row) => row.selected !== false);
    if (!selectedRows.length) {
      throw new BadRequestException('Nenhuma linha selecionada para importar');
    }

    const items = [];
    for (const row of selectedRows) {
      const auction = await this.prisma.auction.create({
        data: {
          ...this.buildCreateData(user.tenantId, {
            name: row.name.trim(),
            scheduledAt: row.scheduledAt ?? undefined,
            status: 'agendado',
            animalType: row.animalType ?? undefined,
            animalSex: row.animalSex ?? undefined,
            livestockCategories: row.livestockCategories ?? [],
            targetIntentionCode: DEFAULT_AUCTION_TARGET_INTENTION,
            active: true,
          }),
          source: 'sheet',
          externalKey: buildAuctionExternalKey(row.name, row.scheduledAt ?? null),
        },
      });
      items.push(this.toDetail(auction));
    }

    return {
      importedCount: items.length,
      fileName: parsed.data.fileName,
      items,
    };
  }

  async update(user: JwtPayload, id: string, dto: UpdateAuctionDto) {
    await this.findAuctionOrThrow(user.tenantId, id);

    const auction = await this.prisma.auction.update({
      where: { id },
      data: this.buildUpdateData(dto),
    });

    return this.toDetail(auction);
  }

  async remove(user: JwtPayload, id: string) {
    await this.findAuctionOrThrow(user.tenantId, id);

    await this.prisma.auction.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });

    return { ok: true };
  }

  async getMatches(user: JwtPayload, auctionId: string, q?: string) {
    const auction = await this.findAuctionOrThrow(user.tenantId, auctionId);
    const matches = await this.prisma.auctionMatch.findMany({
      where: { auctionId: auction.id, ownerId: user.sub },
    });

    const includedIds = new Set(
      matches.filter((m) => m.status === 'included').map((m) => m.clientId),
    );
    const excludedIds = new Set(
      matches.filter((m) => m.status === 'excluded').map((m) => m.clientId),
    );
    const matchByClientId = new Map(matches.map((m) => [m.clientId, m]));
    const decidedIds = [...includedIds, ...excludedIds];

    const suggestedWhere = this.buildMatchWhere(user, auction, q, {
      excludeClientIds: decidedIds,
    });

    const suggestedClients = await this.prisma.client.findMany({
      where: suggestedWhere,
      orderBy: { name: 'asc' },
      include: matchClientInclude,
    });

    const includedClients = includedIds.size
      ? await this.prisma.client.findMany({
          where: {
            ...this.userClientsWhere(user),
            id: { in: [...includedIds] },
            ...(q ? this.buildSearchWhere(q) : {}),
          },
          orderBy: { name: 'asc' },
          include: matchClientInclude,
        })
      : [];

    const searchQuery = q?.trim();
    const manualClients =
      searchQuery && searchQuery.length >= 2
        ? await this.prisma.client.findMany({
            where: {
              ...this.userClientsWhere(user),
              ...this.buildSearchWhere(searchQuery),
              ...(decidedIds.length ? { id: { notIn: decidedIds } } : {}),
            },
            orderBy: { name: 'asc' },
            take: 30,
            include: matchClientInclude,
          })
        : [];

    return {
      suggested: suggestedClients.map((client) =>
        this.toMatchClient(client, null, null, null),
      ),
      included: includedClients.map((client) => {
        const match = matchByClientId.get(client.id);
        return this.toMatchClient(
          client,
          match?.source ?? 'manual',
          match?.status ?? 'included',
          match?.notes ?? null,
        );
      }),
      manual: manualClients.map((client) =>
        this.toMatchClient(client, null, null, null),
      ),
      counts: {
        suggested: suggestedClients.length,
        included: includedClients.length,
        excluded: excludedIds.size,
        manual: manualClients.length,
      },
    };
  }

  async upsertMatch(
    user: JwtPayload,
    auctionId: string,
    dto: UpsertAuctionMatchDto,
  ) {
    const auction = await this.findAuctionOrThrow(user.tenantId, auctionId);
    await this.findUserClientOrThrow(user, dto.clientId);

    if (!AUCTION_MATCH_STATUSES.includes(dto.status as never)) {
      throw new BadRequestException('Status de match inválido');
    }

    const suggestedWhere = this.buildMatchWhere(user, auction, undefined, {
      excludeClientIds: [],
    });
    suggestedWhere.id = dto.clientId;

    const isAutoMatch = await this.prisma.client.count({ where: suggestedWhere });
    const source = isAutoMatch > 0 ? 'auto' : 'manual';

    await this.prisma.auctionMatch.upsert({
      where: {
        auctionId_clientId_ownerId: {
          auctionId: auction.id,
          clientId: dto.clientId,
          ownerId: user.sub,
        },
      },
      create: {
        auctionId: auction.id,
        clientId: dto.clientId,
        ownerId: user.sub,
        status: dto.status,
        source,
        notes: dto.notes?.trim() || null,
      },
      update: {
        status: dto.status,
        source,
        ...(dto.notes !== undefined
          ? { notes: dto.notes?.trim() || null }
          : {}),
      },
    });

    return this.getMatches(user, auctionId);
  }

  async removeMatch(user: JwtPayload, auctionId: string, clientId: string) {
    await this.findAuctionOrThrow(user.tenantId, auctionId);
    await this.findUserClientOrThrow(user, clientId);

    await this.prisma.auctionMatch.deleteMany({
      where: { auctionId, clientId, ownerId: user.sub },
    });

    return this.getMatches(user, auctionId);
  }

  async getIncludedClientIds(
    tenantId: string,
    auctionId: string,
    ownerId?: string,
  ) {
    const auction = await this.prisma.auction.findFirst({
      where: { id: auctionId, tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!auction) return [];

    const matches = await this.prisma.auctionMatch.findMany({
      where: {
        auctionId: auction.id,
        status: 'included',
        ...(ownerId ? { ownerId } : {}),
      },
      select: { clientId: true },
    });

    return matches.map((m) => m.clientId);
  }

  userClientsWhere(user: JwtPayload): Prisma.ClientWhereInput {
    return {
      tenantId: user.tenantId,
      deletedAt: null,
      active: true,
      isDefault: false,
      responsible: {
        userId: user.sub,
        deletedAt: null,
      },
    };
  }

  buildMatchWhere(
    user: JwtPayload,
    auction: {
      animalType: string | null;
      animalSex: string | null;
      livestockCategories: string[];
      targetIntentionCode: string | null;
    },
    q?: string,
    options?: { excludeClientIds?: string[] },
  ): Prisma.ClientWhereInput {
    const hasAttributes =
      Boolean(auction.animalType) ||
      Boolean(auction.animalSex) ||
      auction.livestockCategories.length > 0 ||
      Boolean(auction.targetIntentionCode);

    if (!hasAttributes) {
      return {
        ...this.userClientsWhere(user),
        id: { in: [] },
      };
    }

    const intentionCode =
      auction.targetIntentionCode ?? DEFAULT_AUCTION_TARGET_INTENTION;

    return {
      ...this.userClientsWhere(user),
      AND: [
        ...(auction.animalType ? [{ animalType: auction.animalType }] : []),
        ...(auction.animalSex ? [{ animalSex: auction.animalSex }] : []),
        ...(auction.livestockCategories.length > 0
          ? [{ livestockCategory: { in: auction.livestockCategories } }]
          : []),
        ...(intentionCode
          ? [
              {
                intentions: {
                  some: { intention: { code: intentionCode } },
                },
              },
            ]
          : []),
        ...(options?.excludeClientIds?.length
          ? [{ id: { notIn: options.excludeClientIds } }]
          : []),
        ...(q ? [this.buildSearchWhere(q)] : []),
      ],
    };
  }

  private buildSearchWhere(q: string): Prisma.ClientWhereInput {
    return {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { document: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ],
    };
  }

  private buildCreateData(tenantId: string, dto: CreateAuctionDto) {
    const isBulaRemates =
      dto.isBulaRemates ?? detectIsBulaRemates(dto.name.trim());

    return {
      tenantId,
      name: dto.name.trim(),
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      location: dto.location?.trim() || null,
      status: dto.status ?? 'agendado',
      animalType: dto.animalType ?? null,
      animalSex: dto.animalSex ?? null,
      livestockCategories: dto.livestockCategories ?? [],
      targetIntentionCode:
        dto.targetIntentionCode ?? DEFAULT_AUCTION_TARGET_INTENTION,
      offersNotes: dto.offersNotes?.trim() || null,
      isBulaRemates,
      active: dto.active ?? true,
    };
  }

  private buildUpdateData(dto: UpdateAuctionDto) {
    const data: Prisma.AuctionUpdateInput = {};

    if (dto.name !== undefined) {
      data.name = dto.name.trim();
      if (dto.isBulaRemates === undefined) {
        data.isBulaRemates = detectIsBulaRemates(dto.name.trim());
      }
    }
    if (dto.scheduledAt !== undefined) {
      data.scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    }
    if (dto.location !== undefined) data.location = dto.location?.trim() || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.animalType !== undefined) data.animalType = dto.animalType ?? null;
    if (dto.animalSex !== undefined) data.animalSex = dto.animalSex ?? null;
    if (dto.livestockCategories !== undefined) {
      data.livestockCategories = dto.livestockCategories;
    }
    if (dto.targetIntentionCode !== undefined) {
      data.targetIntentionCode = dto.targetIntentionCode ?? null;
    }
    if (dto.offersNotes !== undefined) {
      data.offersNotes = dto.offersNotes?.trim() || null;
    }
    if (dto.isBulaRemates !== undefined) data.isBulaRemates = dto.isBulaRemates;
    if (dto.active !== undefined) data.active = dto.active;

    return data;
  }

  private toListItem(
    auction: Prisma.AuctionGetPayload<{
      include: { _count: { select: { matches: true } } };
    }>,
  ) {
    return {
      id: auction.id,
      name: auction.name,
      scheduledAt: auction.scheduledAt?.toISOString() ?? null,
      location: auction.location,
      status: auction.status,
      animalType: auction.animalType,
      animalSex: auction.animalSex,
      livestockCategories: auction.livestockCategories,
      targetIntentionCode: auction.targetIntentionCode,
      offersNotes: auction.offersNotes,
      isBulaRemates: auction.isBulaRemates,
      active: auction.active,
      source: auction.source,
      externalKey: auction.externalKey,
      includedCount: auction._count.matches,
      createdAt: auction.createdAt.toISOString(),
      updatedAt: auction.updatedAt.toISOString(),
    };
  }

  private toDetail(auction: {
    id: string;
    name: string;
    scheduledAt: Date | null;
    location: string | null;
    status: string;
    animalType: string | null;
    animalSex: string | null;
    livestockCategories: string[];
    targetIntentionCode: string | null;
    offersNotes: string | null;
    isBulaRemates: boolean;
    active: boolean;
    source: string;
    externalKey: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: auction.id,
      name: auction.name,
      scheduledAt: auction.scheduledAt?.toISOString() ?? null,
      location: auction.location,
      status: auction.status,
      animalType: auction.animalType,
      animalSex: auction.animalSex,
      livestockCategories: auction.livestockCategories,
      targetIntentionCode: auction.targetIntentionCode,
      offersNotes: auction.offersNotes,
      isBulaRemates: auction.isBulaRemates,
      active: auction.active,
      source: auction.source,
      externalKey: auction.externalKey,
      createdAt: auction.createdAt.toISOString(),
      updatedAt: auction.updatedAt.toISOString(),
    };
  }

  private toMatchClient(
    client: MatchClient,
    matchSource: string | null,
    matchStatus: string | null,
    matchNotes: string | null,
  ): AuctionMatchClient {
    return {
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      animalType: client.animalType,
      animalSex: client.animalSex,
      livestockCategory: client.livestockCategory,
      responsible: client.responsible,
      intentions: client.intentions.map((ci) => ({
        id: ci.intention.id,
        code: ci.intention.code,
        label: ci.intention.label,
      })),
      matchSource,
      matchStatus,
      matchNotes,
    };
  }

  private async findAuctionOrThrow(tenantId: string, id: string) {
    const auction = await this.prisma.auction.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!auction) {
      throw new NotFoundException('Leilão não encontrado');
    }

    return auction;
  }

  private async findUserClientOrThrow(user: JwtPayload, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: {
        id: clientId,
        ...this.userClientsWhere(user),
      },
    });

    if (!client) {
      throw new NotFoundException('Cliente não encontrado na sua carteira');
    }

    return client;
  }
}
