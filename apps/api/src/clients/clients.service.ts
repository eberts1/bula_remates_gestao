import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildClientTextSearchConditions,
  buildDigitSearchSql,
} from './client-search.util';
import { CreateClientDto } from './dto/create-client.dto';
import { ClientPropertyDto } from './dto/client-property.dto';
import { UpdateClientDto } from './dto/update-client.dto';

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
    filters?: {
      animalType?: string;
      animalSex?: string;
      livestockCategory?: string;
      intentionId?: string;
    },
  ) {
    const skip = (page - 1) * limit;
    const searchWhere = q
      ? await this.buildSearchWhere(user.tenantId, q)
      : {};
    const where: Prisma.ClientWhereInput = {
      tenantId: user.tenantId,
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
      ...searchWhere,
    };

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
