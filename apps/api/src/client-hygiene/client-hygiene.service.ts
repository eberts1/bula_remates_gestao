import { Injectable } from '@nestjs/common';
import { DocumentStatus, Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/auth.types';
import { clientOwnerScope } from '../common/client-owner-scope.util';
import { PrismaService } from '../prisma/prisma.service';
import { ClientsService } from '../clients/clients.service';
import { GeoService, LocationIssue, CityMatch } from '../geo/geo.service';
import { digitsOnly } from '../clients/client-search.util';
import { BulkTagsDto } from './dto/bulk-tags.dto';
import {
  buildDuplicateGroups,
  DUPLICATE_STRATEGIES,
  type DuplicateMatchReason,
  type DuplicateStrategy,
} from './duplicate-match.util';

export type { DuplicateMatchReason, DuplicateStrategy };

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
    params: {
      issue?: string;
      q?: string;
      page?: number;
      limit?: number;
      state?: string;
      ddd?: string;
    },
  ) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 50;
    const issueFilter = this.normalizeIssue(params.issue);

    const where: Prisma.ClientWhereInput = {
      tenantId: user.tenantId,
      deletedAt: null,
      isDefault: false,
      ...clientOwnerScope(user),
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

    const stateFilter = params.state?.trim().toUpperCase();
    const dddFilter = digitsOnly(params.ddd ?? '').slice(0, 2);

    const evaluated = clients
      .map((client) => this.evaluate(client))
      .filter((entry) => entry.issues.length > 0)
      .filter((entry) =>
        issueFilter === 'any' ? true : entry.issues.includes(issueFilter),
      )
      .filter((entry) =>
        stateFilter ? this.matchesState(entry, stateFilter) : true,
      )
      .filter((entry) =>
        dddFilter.length === 2 ? this.matchesDdd(entry, dddFilter) : true,
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
      where: {
        tenantId: user.tenantId,
        deletedAt: null,
        isDefault: false,
        ...clientOwnerScope(user),
      },
      include: hygieneInclude,
    });

    const counts = {
      location: 0,
      tags: 0,
      incomplete: 0,
      any: 0,
      duplicateGroups: 0,
      duplicateClients: 0,
    };
    for (const client of clients) {
      const { issues } = this.evaluate(client);
      if (issues.length === 0) continue;
      counts.any += 1;
      for (const issue of issues) counts[issue] += 1;
    }

    const dupSummary = this.computeDuplicatesSummary(clients);
    counts.duplicateGroups = dupSummary.groups;
    counts.duplicateClients = dupSummary.clients;

    return counts;
  }

  async findDuplicates(
    user: JwtPayload,
    params: { q?: string; strategies?: string },
  ) {
    const clients = await this.loadHygieneClients(user, params.q);
    const strategies = this.parseStrategies(params.strategies);
    const rawGroups = buildDuplicateGroups(
      clients.map((c) => ({
        id: c.id,
        name: c.name,
        document: c.document,
        email: c.email,
        phone: c.phone,
        properties: c.properties.map((p) => ({
          farmName: p.farmName,
          city: p.city,
          state: p.state,
          phone: p.phone,
        })),
      })),
      strategies,
    );

    const groups = rawGroups.map((g, index) => ({
      id: `group-${index}`,
      reasons: g.reasons,
      clients: g.indices.map((i) =>
        this.clientsService.serializeClient(clients[i] as never),
      ),
    }));

    return {
      groups,
      totalGroups: groups.length,
      totalClients: groups.reduce((sum, g) => sum + g.clients.length, 0),
    };
  }

  private computeDuplicatesSummary(
    clients: Awaited<ReturnType<typeof this.loadHygieneClients>>,
  ) {
    const rawGroups = buildDuplicateGroups(
      clients.map((c) => ({
        id: c.id,
        name: c.name,
        document: c.document,
        email: c.email,
        phone: c.phone,
        properties: c.properties.map((p) => ({
          farmName: p.farmName,
          city: p.city,
          state: p.state,
          phone: p.phone,
        })),
      })),
    );
    return {
      groups: rawGroups.length,
      clients: rawGroups.reduce((sum, g) => sum + g.indices.length, 0),
    };
  }

  private async loadHygieneClients(user: JwtPayload, q?: string) {
    const where: Prisma.ClientWhereInput = {
      tenantId: user.tenantId,
      deletedAt: null,
      isDefault: false,
      ...clientOwnerScope(user),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { document: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.client.findMany({
      where,
      orderBy: { name: 'asc' },
      include: hygieneInclude,
    });
  }

  private parseStrategies(raw?: string): DuplicateStrategy[] {
    if (!raw?.trim()) return [...DUPLICATE_STRATEGIES];
    const parts = raw.split(',').map((s) => s.trim());
    const valid = parts.filter((s): s is DuplicateStrategy =>
      (DUPLICATE_STRATEGIES as readonly string[]).includes(s),
    );
    return valid.length > 0 ? valid : [...DUPLICATE_STRATEGIES];
  }

  async bulkTags(user: JwtPayload, dto: BulkTagsDto) {
    if (dto.clientIds.length === 0) return { updated: 0 };

    const clients = await this.prisma.client.findMany({
      where: {
        id: { in: dto.clientIds },
        tenantId: user.tenantId,
        deletedAt: null,
        ...clientOwnerScope(user),
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

  private matchesState(
    client: { properties: { state: string }[] },
    state: string,
  ): boolean {
    return client.properties.some(
      (p) => p.state.trim().toUpperCase() === state,
    );
  }

  private matchesDdd(
    client: {
      phone: string | null;
      properties: { phone: string | null }[];
    },
    ddd: string,
  ): boolean {
    const phones = [
      client.phone,
      ...client.properties.map((p) => p.phone),
    ].filter((p): p is string => Boolean(p?.trim()));

    return phones.some((phone) => {
      const digits = digitsOnly(phone);
      return new RegExp(`^(55)?${ddd}`).test(digits);
    });
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
