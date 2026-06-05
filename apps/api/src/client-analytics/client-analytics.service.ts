import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { JwtPayload } from '../auth/auth.types';
import { GeoService } from '../geo/geo.service';
import { PrismaService } from '../prisma/prisma.service';

const analyticsInclude = {
  responsible: { select: { id: true, name: true } },
  properties: { orderBy: { sortOrder: 'asc' as const } },
  intentions: {
    include: {
      intention: { select: { id: true, code: true, label: true } },
    },
  },
};

type AnalyticsClient = Prisma.ClientGetPayload<{
  include: typeof analyticsInclude;
}>;

export interface ClientAnalyticsOverview {
  totals: {
    total: number;
    active: number;
    inactive: number;
  };
  byRegion: {
    byState: { state: string; clients: number }[];
    topCities: { city: string; state: string; clients: number }[];
    semRegiao: number;
  };
  farms: {
    total: number;
    comLocalizacao: number;
    semLocalizacao: number;
  };
  tags: {
    comEtiqueta: number;
    semEtiqueta: number;
  };
  byCollaborator: {
    items: { collaboratorId: string; name: string; clients: number }[];
    semResponsavel: number;
  };
}

@Injectable()
export class ClientAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geo: GeoService,
  ) {}

  async overview(user: JwtPayload): Promise<ClientAnalyticsOverview> {
    const clients = await this.prisma.client.findMany({
      where: {
        tenantId: user.tenantId,
        deletedAt: null,
        isDefault: false,
      },
      include: analyticsInclude,
    });

    return {
      totals: this.computeTotals(clients),
      byRegion: this.computeByRegion(clients),
      farms: this.computeFarms(clients),
      tags: this.computeTags(clients),
      byCollaborator: this.computeByCollaborator(clients),
    };
  }

  private computeTotals(clients: AnalyticsClient[]) {
    const active = clients.filter((c) => c.active).length;
    return {
      total: clients.length,
      active,
      inactive: clients.length - active,
    };
  }

  private computeByRegion(clients: AnalyticsClient[]) {
    const stateClients = new Map<string, Set<string>>();
    const cityClients = new Map<string, Set<string>>();

    let semRegiao = 0;

    for (const client of clients) {
      if (client.properties.length === 0) {
        semRegiao += 1;
        continue;
      }

      const statesSeen = new Set<string>();
      for (const property of client.properties) {
        const state = property.state.trim().toUpperCase();
        if (!state) continue;

        statesSeen.add(state);

        const cityKey = `${property.city.trim()}|${state}`;
        if (!cityClients.has(cityKey)) {
          cityClients.set(cityKey, new Set());
        }
        cityClients.get(cityKey)!.add(client.id);
      }

      for (const state of statesSeen) {
        if (!stateClients.has(state)) {
          stateClients.set(state, new Set());
        }
        stateClients.get(state)!.add(client.id);
      }
    }

    const byState = [...stateClients.entries()]
      .map(([state, ids]) => ({ state, clients: ids.size }))
      .sort((a, b) => b.clients - a.clients);

    const topCities = [...cityClients.entries()]
      .map(([key, ids]) => {
        const [city, state] = key.split('|');
        return { city, state, clients: ids.size };
      })
      .sort((a, b) => b.clients - a.clients)
      .slice(0, 10);

    return { byState, topCities, semRegiao };
  }

  private computeFarms(clients: AnalyticsClient[]) {
    let total = 0;
    let comLocalizacao = 0;
    let semLocalizacao = 0;

    for (const client of clients) {
      for (const property of client.properties) {
        total += 1;
        const result = this.geo.validateLocation(property.city, property.state);
        if (result.valid) {
          comLocalizacao += 1;
        } else {
          semLocalizacao += 1;
        }
      }
    }

    return { total, comLocalizacao, semLocalizacao };
  }

  private computeTags(clients: AnalyticsClient[]) {
    let comEtiqueta = 0;
    let semEtiqueta = 0;

    for (const client of clients) {
      const hasTag =
        Boolean(client.animalType) ||
        Boolean(client.livestockCategory) ||
        client.intentions.length > 0;

      if (hasTag) comEtiqueta += 1;
      else semEtiqueta += 1;
    }

    return { comEtiqueta, semEtiqueta };
  }

  private computeByCollaborator(clients: AnalyticsClient[]) {
    const counts = new Map<string, { name: string; clients: number }>();
    let semResponsavel = 0;

    for (const client of clients) {
      if (!client.responsibleId || !client.responsible) {
        semResponsavel += 1;
        continue;
      }

      const existing = counts.get(client.responsibleId);
      if (existing) {
        existing.clients += 1;
      } else {
        counts.set(client.responsibleId, {
          name: client.responsible.name,
          clients: 1,
        });
      }
    }

    const items = [...counts.entries()]
      .map(([collaboratorId, entry]) => ({
        collaboratorId,
        name: entry.name,
        clients: entry.clients,
      }))
      .sort((a, b) => b.clients - a.clients);

    return { items, semResponsavel };
  }
}
