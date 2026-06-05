import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  isBrazilianState,
  normalizeCityName,
} from '../common/geo.util';
import { BRAZILIAN_CITIES } from './brazilian-cities.data';
import { DDD_REGIONS, type DddRegion } from './ddd-region.data';

export interface CityMatch {
  id: number;
  name: string;
  state: string;
}

export interface CityCoords {
  lat: number;
  lng: number;
}

export interface CityInRadius {
  city: string;
  state: string;
  lat: number;
  lng: number;
  distanceKm: number;
}

export type LocationIssue = 'invalid_uf' | 'empty_city' | 'unknown_city';

export interface LocationValidation {
  valid: boolean;
  issue?: LocationIssue;
  suggestions: CityMatch[];
}

interface IndexedCity extends CityMatch {
  normalizedName: string;
  latitude: number | null;
  longitude: number | null;
}

@Injectable()
export class GeoService implements OnModuleInit {
  private readonly byState = new Map<string, IndexedCity[]>();
  private readonly byKey = new Map<string, IndexedCity>();
  private readonly allWithCoords: IndexedCity[] = [];

  constructor(private readonly prisma: PrismaService) {
    for (const [id, name, state, latitude, longitude] of BRAZILIAN_CITIES) {
      const normalizedName = normalizeCityName(name);
      const city: IndexedCity = {
        id,
        name,
        state,
        normalizedName,
        latitude,
        longitude,
      };
      const list = this.byState.get(state);
      if (list) list.push(city);
      else this.byState.set(state, [city]);
      this.byKey.set(`${normalizedName}|${state}`, city);
      if (latitude != null && longitude != null) {
        this.allWithCoords.push(city);
      }
    }
  }

  async onModuleInit() {
    const count = await this.prisma.brazilianCity.count();
    if (count >= BRAZILIAN_CITIES.length) {
      await this.syncCityCoords();
      return;
    }

    await this.prisma.brazilianCity.createMany({
      data: BRAZILIAN_CITIES.map(([id, name, state, latitude, longitude]) => ({
        id,
        name,
        state,
        normalizedName: normalizeCityName(name),
        latitude,
        longitude,
      })),
      skipDuplicates: true,
    });
  }

  private async syncCityCoords() {
    const missing = await this.prisma.brazilianCity.count({
      where: { OR: [{ latitude: null }, { longitude: null }] },
    });
    if (missing === 0) return;

    const updates = BRAZILIAN_CITIES.filter(
      ([, , , lat, lng]) => lat != null && lng != null,
    );
    for (const [id, , , latitude, longitude] of updates) {
      await this.prisma.brazilianCity.updateMany({
        where: { id, OR: [{ latitude: null }, { longitude: null }] },
        data: { latitude, longitude },
      });
    }
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

  getCityCoords(city: string, state: string): CityCoords | null {
    const uf = state.trim().toUpperCase();
    const normalized = normalizeCityName(city.trim());
    const entry = this.byKey.get(`${normalized}|${uf}`);
    if (!entry || entry.latitude == null || entry.longitude == null) {
      return null;
    }
    return { lat: entry.latitude, lng: entry.longitude };
  }

  getDddRegion(ddd: string): DddRegion | null {
    const code = ddd.replace(/\D/g, '').slice(0, 2);
    return DDD_REGIONS[code] ?? null;
  }

  extractDddFromPhone(phone: string | null | undefined): string | null {
    if (!phone?.trim()) return null;
    const digits = phone.replace(/\D/g, '');
    const local =
      digits.length >= 12 && digits.startsWith('55') ? digits.slice(2) : digits;
    if (local.length < 10) return null;
    const ddd = local.slice(0, 2);
    const n = Number(ddd);
    if (n < 11 || n > 99) return null;
    return ddd;
  }

  isPointInBounds(
    lat: number,
    lng: number,
    bounds: { south: number; north: number; west: number; east: number },
  ): boolean {
    return (
      lat >= bounds.south &&
      lat <= bounds.north &&
      lng >= bounds.west &&
      lng <= bounds.east
    );
  }

  isPointInCircle(
    lat: number,
    lng: number,
    center: { lat: number; lng: number },
    radiusKm: number,
  ): boolean {
    return this.haversineKm({ lat, lng }, center) <= radiusKm;
  }

  haversineKm(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
  ): number {
    const R = 6371;
    const dLat = this.toRad(b.lat - a.lat);
    const dLng = this.toRad(b.lng - a.lng);
    const lat1 = this.toRad(a.lat);
    const lat2 = this.toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  citiesWithinRadius(
    lat: number,
    lng: number,
    radiusKm: number,
  ): CityInRadius[] {
    const results: CityInRadius[] = [];
    for (const city of this.allWithCoords) {
      const distanceKm = this.haversineKm(
        { lat, lng },
        { lat: city.latitude!, lng: city.longitude! },
      );
      if (distanceKm <= radiusKm) {
        results.push({
          city: city.name,
          state: city.state,
          lat: city.latitude!,
          lng: city.longitude!,
          distanceKm,
        });
      }
    }
    return results.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  resolveClientLocation(input: {
    properties: Array<{ city: string; state: string; phone?: string | null }>;
    phone?: string | null;
  }): {
    lat: number;
    lng: number;
    approx: boolean;
    source: 'city' | 'ddd';
    label: string;
  } | null {
    for (const property of input.properties) {
      const coords = this.getCityCoords(property.city, property.state);
      if (coords) {
        return {
          ...coords,
          approx: false,
          source: 'city',
          label: `${property.city}/${property.state}`,
        };
      }
    }

    const phones = [
      input.phone,
      ...input.properties.map((p) => p.phone),
    ].filter(Boolean) as string[];

    for (const phone of phones) {
      const ddd = this.extractDddFromPhone(phone);
      if (!ddd) continue;
      const region = this.getDddRegion(ddd);
      if (!region) continue;
      return {
        lat: region.refLat,
        lng: region.refLng,
        approx: true,
        source: 'ddd',
        label: `DDD ${ddd} — ${region.regionLabel}`,
      };
    }

    return null;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
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
