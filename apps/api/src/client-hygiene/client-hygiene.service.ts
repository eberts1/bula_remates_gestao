import { Injectable } from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { GeoService, LocationIssue, CityMatch } from '../geo/geo.service';
import { BulkTagsDto } from './dto/bulk-tags.dto';

const HYGIENE_ISSUES = ['location', 'tags', 'incomplete'] as const;
export type HygieneIssue = (typeof HYGIENE_ISSUES)[number];

export interface LocationProblem {
  propertyId: string;
  city: string;
  state: string;
  issue: LocationIssue;
  suggestions: CityMatch[];
}

const hygieneInclude = {
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
export class ClientHygieneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
    private readonly clientsService: ClientsService,
  ) {}

  async list(
    user: JwtPayload,
    params: { issue?: string; q?: string; page?: number; limit?: number },
  ) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 50;
    const issueFilter = this.normalizeIssue(params.issue);

    const where: Prisma.ClientWhereInput = {
      tenantId: user.tenantId,
      deletedAt: null,
      isDefault: false,
      ...(params.q
        ? {
            OR: [
              { name: { contains: params.q, mode: 'insensitive' } },
              { document: { contains: params.q, mode: 'insensitive' } },
              { email: { contains: params.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const clients = await this.prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
      include: hygieneInclude,
    });

    const evaluated = clients
      .map((client) => this.evaluate(client))
      .filter((entry) => entry.issues.length > 0)
      .filter((entry) =>
        issueFilter === 'any' ? true : entry.issues.includes(issueFilter),
      );

    const total = evaluated.length;
    const start = (page - 1) * limit;
    const items = evaluated.slice(start, start + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async summary(user: JwtPayload) {
    const clients = await this.prisma.client.findMany({
      where: { tenantId: user.tenantId, deletedAt: null, isDefault: false },
      include: hygieneInclude,
    });

    const counts = { location: 0, tags: 0, incomplete: 0, any: 0 };
    for (const client of clients) {
      const { issues } = this.evaluate(client);
      if (issues.length === 0) continue;
      counts.any += 1;
      for (const issue of issues) counts[issue] += 1;
    }
    return counts;
  }

  async bulkTags(user: JwtPayload, dto: BulkTagsDto) {
    if (dto.clientIds.length === 0) return { updated: 0 };

    const clients = await this.prisma.client.findMany({
      where: {
        id: { in: dto.clientIds },
        tenantId: user.tenantId,
        deletedAt: null,
      },
      select: { id: true },
    });
    const ids = clients.map((c) => c.id);
    if (ids.length === 0) return { updated: 0 };

    const data: Prisma.ClientUpdateManyMutationInput = {
      ...(dto.animalType !== undefined ? { animalType: dto.animalType } : {}),
      ...(dto.animalSex !== undefined ? { animalSex: dto.animalSex } : {}),
      ...(dto.livestockCategory !== undefined
        ? { livestockCategory: dto.livestockCategory }
        : {}),
    };

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(data).length > 0) {
        await tx.client.updateMany({ where: { id: { in: ids } }, data });
      }
      if (dto.intentionIds !== undefined) {
        for (const id of ids) {
          await this.clientsService.syncClientIntentions(
            tx,
            id,
            dto.intentionIds,
          );
        }
      }
    });

    return { updated: ids.length };
  }

  private normalizeIssue(issue?: string): HygieneIssue | 'any' {
    if (issue && (HYGIENE_ISSUES as readonly string[]).includes(issue)) {
      return issue as HygieneIssue;
    }
    return 'any';
  }

  private evaluate(client: {
    id: string;
    document: string | null;
    addressFull: string | null;
    animalType: string | null;
    livestockCategory: string | null;
    intentions: unknown[];
    properties: { id: string; city: string; state: string }[];
    [key: string]: unknown;
  }) {
    const issues: HygieneIssue[] = [];

    const locationProblems: LocationProblem[] = [];
    for (const property of client.properties) {
      const result = this.geo.validateLocation(property.city, property.state);
      if (!result.valid && result.issue) {
        locationProblems.push({
          propertyId: property.id,
          city: property.city,
          state: property.state,
          issue: result.issue,
          suggestions: result.suggestions,
        });
      }
    }
    if (locationProblems.length > 0) issues.push('location');

    const hasTag =
      Boolean(client.animalType) ||
      Boolean(client.livestockCategory) ||
      client.intentions.length > 0;
    if (!hasTag) issues.push('tags');

    const complete = Boolean(
      client.document?.trim() &&
        client.addressFull?.trim() &&
        client.properties.length > 0,
    );
    if (!complete) issues.push('incomplete');

    return {
      ...this.clientsService.serializeClient(client as never),
      issues,
      locationProblems,
    };
  }
}
