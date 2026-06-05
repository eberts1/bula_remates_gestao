import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';
import {
  buildClientTextSearchConditions,
  buildDigitSearchSql,
  digitsOnly,
} from './client-search.util';
import { CreateClientDto } from './dto/create-client.dto';
import { ClientPropertyDto } from './dto/client-property.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { MergeClientsDto } from './dto/merge-clients.dto';
import { ensureBrazilMobileNinthDigit } from '@docs/shared';

export interface ClientListFilters {
  animalType?: string;
  animalSex?: string;
  livestockCategory?: string;
  intentionId?: string;
  state?: string;
  ddd?: string;
}

const EXPORT_HEADERS = [
  'nome',
  'telefone',
  'email',
  'documento',
  'observacao',
  'status',
  'tipo_interesse',
  'sexo_interesse',
  'categoria_interesse',
] as const;

const clientInclude = {
  responsible: { select: { id: true, name: true } },
  properties: { orderBy: { sortOrder: 'asc' as const } },
  intentions: {
    include: {
      intention: { select: { id: true, code: true, label: true } },
    },
  },
  _count: {
    select: {
      documents: {
        where: { deletedAt: null, status: DocumentStatus.ready },
      },
    },
  },
};

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    user: JwtPayload,
    q?: string,
    page = 1,
    limit = 20,
    filters?: ClientListFilters,
  ) {
    const skip = (page - 1) * limit;
    const where = await this.buildListWhere(user.tenantId, q, filters);

    const [items, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: clientInclude,
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      items: items.map((c) => this.serializeClient(c)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async exportXlsx(user: JwtPayload, q?: string, filters?: ClientListFilters) {
    const where = await this.buildListWhere(user.tenantId, q, filters);
    const clients = await this.prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
      include: clientInclude,
    });

    const rows = clients.map((client) => {
      const serialized = this.serializeClient(client);
      return [
        serialized.name,
        ensureBrazilMobileNinthDigit(serialized.phone),
        serialized.email ?? '',
        serialized.document ?? '',
        serialized.notes ?? '',
        serialized.active ? 'ativo' : 'inativo',
        serialized.animalType ?? '',
        serialized.animalSex ?? '',
        serialized.livestockCategory ?? '',
      ];
    });

    const sheet = XLSX.utils.aoa_to_sheet([[...EXPORT_HEADERS], ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Contatos');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private async buildListWhere(
    tenantId: string,
    q?: string,
    filters?: ClientListFilters,
  ): Promise<Prisma.ClientWhereInput> {
    const searchWhere = q ? await this.buildSearchWhere(tenantId, q) : {};
    const stateFilter = filters?.state?.trim().toUpperCase();
    const dddFilter = digitsOnly(filters?.ddd ?? '').slice(0, 2);
    const dddWhere =
      dddFilter.length === 2
        ? await this.buildDddWhere(tenantId, dddFilter)
        : {};

    return {
      tenantId,
      deletedAt: null,
      ...(filters?.animalType ? { animalType: filters.animalType } : {}),
      ...(filters?.animalSex ? { animalSex: filters.animalSex } : {}),
      ...(filters?.livestockCategory
        ? { livestockCategory: filters.livestockCategory }
        : {}),
      ...(filters?.intentionId
        ? {
            intentions: {
              some: { intentionId: filters.intentionId },
            },
          }
        : {}),
      ...(stateFilter
        ? {
            properties: {
              some: { state: { equals: stateFilter } },
            },
          }
        : {}),
      ...searchWhere,
      ...dddWhere,
    };
  }

  private async buildDddWhere(
    tenantId: string,
    ddd: string,
  ): Promise<Prisma.ClientWhereInput> {
    const digitSql = buildDigitSearchSql(tenantId, ddd);
    if (!digitSql) return { id: { in: [] } };

    const rows = await this.prisma.$queryRaw<{ id: string }[]>(digitSql.sql);
    const ids = rows.map((r) => r.id);
    return ids.length > 0 ? { id: { in: ids } } : { id: { in: [] } };
  }

  private async buildSearchWhere(
    tenantId: string,
    q: string,
  ): Promise<Prisma.ClientWhereInput> {
    const conditions = buildClientTextSearchConditions(q);

    const digitSql = buildDigitSearchSql(tenantId, q);
    if (digitSql) {
      const rows = await this.prisma.$queryRaw<{ id: string }[]>(digitSql.sql);
      const ids = rows.map((r) => r.id);
      if (ids.length > 0) {
        conditions.push({ id: { in: ids } });
      }
    }

    return conditions.length > 0 ? { OR: conditions } : {};
  }

  async findOne(user: JwtPayload, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId: user.tenantId, deletedAt: null },
      include: clientInclude,
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    return this.serializeClient(client);
  }

  async create(user: JwtPayload, dto: CreateClientDto) {
    if (dto.responsibleId) {
      await this.assertResponsible(user.tenantId, dto.responsibleId);
    }

    const client = await this.prisma.$transaction(async (tx) => {
      const created = await tx.client.create({
        data: {
          tenantId: user.tenantId,
          name: dto.name,
          document: dto.document?.trim() || null,
          email: dto.email || null,
          phone: dto.phone ?? null,
          addressFull: dto.addressFull ?? null,
          notes: dto.notes ?? null,
          active: dto.active ?? true,
          responsibleId: dto.responsibleId ?? null,
          animalType: dto.animalType ?? null,
          animalSex: dto.animalSex ?? null,
          livestockCategory: dto.livestockCategory ?? null,
          intentionNotes: dto.intentionNotes ?? null,
        },
      });

      if (dto.properties?.length) {
        await this.syncProperties(tx, user.tenantId, created.id, dto.properties);
      }

      if (dto.intentionIds?.length) {
        await this.syncClientIntentions(tx, created.id, dto.intentionIds);
      }

      return tx.client.findFirstOrThrow({
        where: { id: created.id },
        include: clientInclude,
      });
    });

    return this.serializeClient(client);
  }

  async update(user: JwtPayload, id: string, dto: UpdateClientDto) {
    await this.findOrThrow(user.tenantId, id);

    if (dto.responsibleId !== undefined && dto.responsibleId !== null) {
      await this.assertResponsible(user.tenantId, dto.responsibleId);
    }

    const client = await this.prisma.$transaction(async (tx) => {
      await tx.client.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name } : {}),
          ...(dto.document !== undefined
            ? { document: dto.document?.trim() || null }
            : {}),
          ...(dto.email !== undefined ? { email: dto.email || null } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone ?? null } : {}),
          ...(dto.addressFull !== undefined
            ? { addressFull: dto.addressFull ?? null }
            : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes ?? null } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
          ...(dto.responsibleId !== undefined
            ? { responsibleId: dto.responsibleId }
            : {}),
          ...(dto.animalType !== undefined ? { animalType: dto.animalType } : {}),
          ...(dto.animalSex !== undefined ? { animalSex: dto.animalSex } : {}),
          ...(dto.livestockCategory !== undefined
            ? { livestockCategory: dto.livestockCategory }
            : {}),
          ...(dto.intentionNotes !== undefined
            ? { intentionNotes: dto.intentionNotes }
            : {}),
        },
      });

      if (dto.properties !== undefined) {
        await this.syncProperties(tx, user.tenantId, id, dto.properties);
      }

      if (dto.intentionIds !== undefined) {
        await this.syncClientIntentions(tx, id, dto.intentionIds);
      }

      return tx.client.findFirstOrThrow({
        where: { id },
        include: clientInclude,
      });
    });

    return this.serializeClient(client);
  }

  async syncClientIntentions(
    tx: Prisma.TransactionClient,
    clientId: string,
    intentionIds: string[],
  ) {
    await tx.clientIntention.deleteMany({ where: { clientId } });
    if (intentionIds.length === 0) return;
    await tx.clientIntention.createMany({
      data: intentionIds.map((intentionId) => ({ clientId, intentionId })),
      skipDuplicates: true,
    });
  }

  async appendPropertyIfNotExists(
    tx: Prisma.TransactionClient,
    tenantId: string,
    clientId: string,
    property: {
      farmName: string;
      city: string;
      state: string;
      phone?: string;
      routeNotes?: string;
      ie?: string;
      nirf?: string;
    },
  ) {
    const existing = await tx.clientProperty.findFirst({
      where: {
        clientId,
        tenantId,
        farmName: { equals: property.farmName, mode: 'insensitive' },
        city: { equals: property.city, mode: 'insensitive' },
        state: property.state.toUpperCase(),
      },
    });
    if (existing) return;

    const count = await tx.clientProperty.count({ where: { clientId } });
    await tx.clientProperty.create({
      data: {
        clientId,
        tenantId,
        farmName: property.farmName,
        city: property.city,
        state: property.state.toUpperCase(),
        phone: property.phone ?? null,
        routeNotes: property.routeNotes ?? null,
        ie: property.ie ?? null,
        nirf: property.nirf ?? null,
        sortOrder: count,
      },
    });
  }

  async merge(user: JwtPayload, dto: MergeClientsDto) {
    const mergedIds = dto.mergedIds.filter((id) => id !== dto.masterId);
    if (mergedIds.length === 0) {
      throw new BadRequestException('Informe ao menos um cadastro para unificar');
    }

    const allIds = [dto.masterId, ...mergedIds];
    const clients = await this.prisma.client.findMany({
      where: {
        id: { in: allIds },
        tenantId: user.tenantId,
        deletedAt: null,
      },
      include: clientInclude,
    });

    if (clients.length !== allIds.length) {
      throw new NotFoundException('Um ou mais clientes não foram encontrados');
    }

    const master = clients.find((c) => c.id === dto.masterId);
    if (!master) throw new NotFoundException('Cliente principal não encontrado');
    if (master.isDefault) {
      throw new BadRequestException('Não é possível unificar o cliente padrão');
    }

    const toMerge = clients.filter((c) => mergedIds.includes(c.id));
    if (toMerge.some((c) => c.isDefault)) {
      throw new BadRequestException('Não é possível unificar o cliente padrão');
    }

    const altContacts = this.collectAlternateContacts(
      clients,
      dto.resolved.email ?? null,
      dto.resolved.phone ?? null,
    );

    await this.prisma.$transaction(async (tx) => {
      for (const id of mergedIds) {
        await tx.clientProperty.updateMany({
          where: { clientId: id, tenantId: user.tenantId },
          data: { clientId: dto.masterId },
        });
        await tx.document.updateMany({
          where: { clientId: id, tenantId: user.tenantId },
          data: { clientId: dto.masterId },
        });
        await tx.clientFormToken.updateMany({
          where: { clientId: id, tenantId: user.tenantId },
          data: { clientId: dto.masterId },
        });
      }

      const intentionSet = new Set<string>(
        dto.resolved.intentionIds ?? [
          ...master.intentions.map((i) => i.intentionId),
          ...toMerge.flatMap((c) =>
            c.intentions.map((i) => i.intentionId),
          ),
        ],
      );
      await this.syncClientIntentions(tx, dto.masterId, [...intentionSet]);

      if (dto.resolved.properties !== undefined) {
        await this.syncProperties(
          tx,
          user.tenantId,
          dto.masterId,
          dto.resolved.properties,
        );
      } else {
        await this.dedupeMasterProperties(tx, user.tenantId, dto.masterId);
      }

      const notesAppend =
        altContacts.length > 0
          ? `\n\nContatos alternativos: ${altContacts.join('; ')}`
          : '';
      const existingNotes = master.notes?.trim() ?? '';
      const newNotes = existingNotes
        ? `${existingNotes}${notesAppend}`
        : notesAppend.trim() || null;

      await tx.client.update({
        where: { id: dto.masterId },
        data: {
          name: dto.resolved.name,
          document: dto.resolved.document?.trim() || null,
          email: dto.resolved.email?.trim() || null,
          phone: dto.resolved.phone?.trim() || null,
          addressFull: dto.resolved.addressFull?.trim() || null,
          animalType: dto.resolved.animalType ?? null,
          animalSex: dto.resolved.animalSex ?? null,
          livestockCategory: dto.resolved.livestockCategory ?? null,
          ...(notesAppend ? { notes: newNotes } : {}),
        },
      });

      await tx.client.updateMany({
        where: { id: { in: mergedIds }, tenantId: user.tenantId },
        data: { deletedAt: new Date(), active: false },
      });
    });

    return this.findOne(user, dto.masterId);
  }

  private collectAlternateContacts(
    clients: Array<{ email: string | null; phone: string | null }>,
    chosenEmail: string | null,
    chosenPhone: string | null,
  ): string[] {
    const alts: string[] = [];
    const chosenEmailNorm = chosenEmail?.trim().toLowerCase() ?? '';
    const chosenPhoneNorm = chosenPhone?.replace(/\D/g, '') ?? '';

    for (const c of clients) {
      const email = c.email?.trim();
      if (
        email &&
        email.toLowerCase() !== chosenEmailNorm &&
        !alts.includes(email)
      ) {
        alts.push(email);
      }
      const phone = c.phone?.trim();
      if (phone) {
        const digits = phone.replace(/\D/g, '');
        if (digits && digits !== chosenPhoneNorm && !alts.includes(phone)) {
          alts.push(phone);
        }
      }
    }
    return alts;
  }

  private async dedupeMasterProperties(
    tx: Prisma.TransactionClient,
    tenantId: string,
    clientId: string,
  ) {
    const properties = await tx.clientProperty.findMany({
      where: { clientId, tenantId },
      orderBy: { sortOrder: 'asc' },
    });

    const seen = new Set<string>();
    const toDelete: string[] = [];

    for (const p of properties) {
      const key = `${p.farmName.toLowerCase()}|${p.city.toLowerCase()}|${p.state.toUpperCase()}`;
      if (seen.has(key)) {
        toDelete.push(p.id);
      } else {
        seen.add(key);
      }
    }

    if (toDelete.length > 0) {
      await tx.clientProperty.deleteMany({ where: { id: { in: toDelete } } });
    }

    const remaining = await tx.clientProperty.findMany({
      where: { clientId, tenantId },
      orderBy: { sortOrder: 'asc' },
    });
    for (let i = 0; i < remaining.length; i++) {
      await tx.clientProperty.update({
        where: { id: remaining[i].id },
        data: { sortOrder: i },
      });
    }
  }

  async remove(user: JwtPayload, id: string) {
    const client = await this.findOrThrow(user.tenantId, id);
    if (client.isDefault) {
      throw new BadRequestException('Não é possível excluir o cliente padrão');
    }

    await this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date(), active: false },
    });
    return { ok: true };
  }

  async assertClientBelongsToTenant(tenantId: string, clientId: string) {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, tenantId, deletedAt: null, active: true },
    });
    if (!client) {
      throw new NotFoundException('Cliente não encontrado');
    }
    return client;
  }

  async syncProperties(
    tx: Prisma.TransactionClient,
    tenantId: string,
    clientId: string,
    properties: ClientPropertyDto[],
  ) {
    await tx.clientProperty.deleteMany({ where: { clientId, tenantId } });

    if (properties.length === 0) return;

    await tx.clientProperty.createMany({
      data: properties.map((p, index) => ({
        clientId,
        tenantId,
        farmName: p.farmName,
        city: p.city,
        state: p.state.toUpperCase(),
        routeNotes: p.routeNotes ?? null,
        phone: p.phone ?? null,
        ie: p.ie ?? null,
        nirf: p.nirf ?? null,
        sortOrder: index,
      })),
    });
  }

  private async findOrThrow(tenantId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!client) throw new NotFoundException('Cliente não encontrado');
    return client;
  }

  private async assertResponsible(tenantId: string, responsibleId: string) {
    const collab = await this.prisma.collaborator.findFirst({
      where: {
        id: responsibleId,
        tenantId,
        deletedAt: null,
        active: true,
      },
    });
    if (!collab) {
      throw new BadRequestException('Colaborador responsável inválido');
    }
  }

  private serializeProperty(p: {
    id: string;
    farmName: string;
    city: string;
    state: string;
    routeNotes: string | null;
    phone: string | null;
    ie: string | null;
    nirf: string | null;
    sortOrder: number;
  }) {
    return {
      id: p.id,
      farmName: p.farmName,
      city: p.city,
      state: p.state,
      routeNotes: p.routeNotes,
      phone: p.phone,
      ie: p.ie,
      nirf: p.nirf,
      sortOrder: p.sortOrder,
    };
  }

  private isProfileComplete(client: {
    document: string | null;
    addressFull?: string | null;
    properties?: { length: number } | Array<unknown>;
  }) {
    const props = Array.isArray(client.properties) ? client.properties : [];
    return Boolean(
      client.document?.trim() &&
        client.addressFull?.trim() &&
        props.length > 0,
    );
  }

  serializeClient(client: {
    id: string;
    name: string;
    document: string | null;
    email: string | null;
    phone: string | null;
    addressFull?: string | null;
    notes: string | null;
    animalType?: string | null;
    animalSex?: string | null;
    livestockCategory?: string | null;
    intentionNotes?: string | null;
    active: boolean;
    isDefault: boolean;
    responsibleId: string | null;
    createdAt: Date;
    updatedAt: Date;
    responsible?: { id: string; name: string } | null;
    intentions?: Array<{
      intention: { id: string; code: string; label: string };
    }>;
    properties?: Array<{
      id: string;
      farmName: string;
      city: string;
      state: string;
      routeNotes: string | null;
      phone: string | null;
      ie: string | null;
      nirf: string | null;
      sortOrder: number;
    }>;
    _count?: { documents: number };
  }) {
    const properties = (client.properties ?? []).map((p) =>
      this.serializeProperty(p),
    );
    return {
      id: client.id,
      name: client.name,
      document: client.document,
      email: client.email,
      phone: client.phone,
      addressFull: client.addressFull ?? null,
      notes: client.notes,
      animalType: client.animalType ?? null,
      animalSex: client.animalSex ?? null,
      livestockCategory: client.livestockCategory ?? null,
      intentionNotes: client.intentionNotes ?? null,
      intentions: (client.intentions ?? []).map((ci) => ci.intention),
      active: client.active,
      isDefault: client.isDefault,
      responsibleId: client.responsibleId,
      responsible: client.responsible ?? null,
      properties,
      isComplete: this.isProfileComplete({ ...client, properties }),
      documentCount: client._count?.documents ?? 0,
      createdAt: client.createdAt.toISOString(),
      updatedAt: client.updatedAt.toISOString(),
    };
  }
}
