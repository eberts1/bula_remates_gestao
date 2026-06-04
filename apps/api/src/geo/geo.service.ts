import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  isBrazilianState,
  normalizeCityName,
} from '../common/geo.util';
import { BRAZILIAN_CITIES } from './brazilian-cities.data';

export interface CityMatch {
  id: number;
  name: string;
  state: string;
}

export type LocationIssue = 'invalid_uf' | 'empty_city' | 'unknown_city';

export interface LocationValidation {
  valid: boolean;
  issue?: LocationIssue;
  suggestions: CityMatch[];
}

interface IndexedCity extends CityMatch {
  normalizedName: string;
}

@Injectable()
export class GeoService implements OnModuleInit {
  private readonly byState = new Map<string, IndexedCity[]>();
  private readonly byKey = new Map<string, CityMatch>();

  constructor(private readonly prisma: PrismaService) {
    for (const [id, name, state] of BRAZILIAN_CITIES) {
      const normalizedName = normalizeCityName(name);
      const city: IndexedCity = { id, name, state, normalizedName };
      const list = this.byState.get(state);
      if (list) list.push(city);
      else this.byState.set(state, [city]);
      this.byKey.set(`${normalizedName}|${state}`, { id, name, state });
    }
  }

  async onModuleInit() {
    const count = await this.prisma.brazilianCity.count();
    if (count >= BRAZILIAN_CITIES.length) return;

    await this.prisma.brazilianCity.createMany({
      data: BRAZILIAN_CITIES.map(([id, name, state]) => ({
        id,
        name,
        state,
        normalizedName: normalizeCityName(name),
      })),
      skipDuplicates: true,
    });
  }

  searchCities(state: string, q: string | undefined, limit = 20): CityMatch[] {
    const uf = state.trim().toUpperCase();
    const list = this.byState.get(uf);
    if (!list) return [];

    const query = q ? normalizeCityName(q) : '';
    const matches = query
      ? list.filter((c) => c.normalizedName.includes(query))
      : list;

    return matches
      .slice()
      .sort((a, b) => {
        if (query) {
          const aStarts = a.normalizedName.startsWith(query) ? 0 : 1;
          const bStarts = b.normalizedName.startsWith(query) ? 0 : 1;
          if (aStarts !== bStarts) return aStarts - bStarts;
        }
        return a.name.localeCompare(b.name, 'pt-BR');
      })
      .slice(0, limit)
      .map(({ id, name, state: s }) => ({ id, name, state: s }));
  }

  validateLocation(city: string, state: string): LocationValidation {
    const uf = state.trim().toUpperCase();

    if (!isBrazilianState(uf)) {
      return { valid: false, issue: 'invalid_uf', suggestions: [] };
    }

    const trimmedCity = city.trim();
    if (!trimmedCity || trimmedCity === '—') {
      return {
        valid: false,
        issue: 'empty_city',
        suggestions: this.searchCities(uf, undefined, 5),
      };
    }

    const normalized = normalizeCityName(trimmedCity);
    if (this.byKey.has(`${normalized}|${uf}`)) {
      return { valid: true, suggestions: [] };
    }

    return {
      valid: false,
      issue: 'unknown_city',
      suggestions: this.suggest(normalized, uf, 3),
    };
  }

  private suggest(normalizedQuery: string, state: string, limit: number): CityMatch[] {
    const list = this.byState.get(state);
    if (!list) return [];

    return list
      .map((c) => ({
        city: c,
        score: this.similarity(normalizedQuery, c.normalizedName),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .filter((entry) => entry.score > 0)
      .map(({ city }) => ({ id: city.id, name: city.name, state: city.state }));
  }

  private similarity(a: string, b: string): number {
    if (a === b) return 1;
    if (b.includes(a) || a.includes(b)) return 0.85;
    const distance = this.levenshtein(a, b);
    const maxLen = Math.max(a.length, b.length) || 1;
    return 1 - distance / maxLen;
  }

  private levenshtein(a: string, b: string): number {
    const rows = a.length + 1;
    const cols = b.length + 1;
    const prev = new Array<number>(cols);
    const curr = new Array<number>(cols);
    for (let j = 0; j < cols; j++) prev[j] = j;

    for (let i = 1; i < rows; i++) {
      curr[0] = i;
      for (let j = 1; j < cols; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      }
      for (let j = 0; j < cols; j++) prev[j] = curr[j];
    }
    return prev[cols - 1];
  }
}
