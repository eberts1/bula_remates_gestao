import { digitsOnly } from '../clients/client-search.util';
import { normalizePhone } from '../client-imports/parsers/phone.util';

export const DUPLICATE_STRATEGIES = [
  'document',
  'email',
  'phone',
  'nameExact',
  'nameFuzzy',
  'nameCity',
  'farmName',
] as const;

export type DuplicateStrategy = (typeof DUPLICATE_STRATEGIES)[number];

export type DuplicateMatchReason = DuplicateStrategy;

const FUZZY_THRESHOLD = 0.85;

export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeFarmKey(
  farmName: string,
  city: string,
  state: string,
): string {
  return `${normalizeName(farmName)}|${normalizeName(city)}|${state.trim().toUpperCase()}`;
}

function levenshtein(a: string, b: string): number {
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

export function nameSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;
  if (b.includes(a) || a.includes(b)) return 0.85;
  const distance = levenshtein(a, b);
  const maxLen = Math.max(a.length, b.length) || 1;
  return 1 - distance / maxLen;
}

export function nameBucketKey(normalizedName: string): string {
  const parts = normalizedName.split(' ').filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  return `${parts[0]}|${parts[parts.length - 1]}`;
}

class UnionFind {
  private parent: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  union(a: number, b: number) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra !== rb) this.parent[rb] = ra;
  }
}

export interface ClientForDuplicateMatch {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  properties: {
    farmName: string;
    city: string;
    state: string;
    phone?: string | null;
  }[];
}

function connectByKeyMap(
  uf: UnionFind,
  keyToIndices: Map<string, number[]>,
) {
  for (const indices of keyToIndices.values()) {
    if (indices.length < 2) continue;
    const first = indices[0];
    for (let i = 1; i < indices.length; i++) {
      uf.union(first, indices[i]);
    }
  }
}

function addToMap(map: Map<string, number[]>, key: string, index: number) {
  if (!key) return;
  const list = map.get(key) ?? [];
  list.push(index);
  map.set(key, list);
}

export function buildDuplicateGroups(
  clients: ClientForDuplicateMatch[],
  strategies: DuplicateStrategy[] = [...DUPLICATE_STRATEGIES],
): { indices: number[]; reasons: DuplicateMatchReason[] }[] {
  if (clients.length < 2) return [];

  const active = new Set(strategies);
  const uf = new UnionFind(clients.length);

  if (active.has('document')) {
    const map = new Map<string, number[]>();
    clients.forEach((c, i) => {
      const doc = digitsOnly(c.document ?? '');
      if (doc.length >= 11) addToMap(map, `doc:${doc}`, i);
    });
    connectByKeyMap(uf, map);
  }

  if (active.has('email')) {
    const map = new Map<string, number[]>();
    clients.forEach((c, i) => {
      const email = c.email?.trim().toLowerCase();
      if (email) addToMap(map, `email:${email}`, i);
    });
    connectByKeyMap(uf, map);
  }

  if (active.has('phone')) {
    const map = new Map<string, number[]>();
    clients.forEach((c, i) => {
      const phone = normalizePhone(c.phone);
      if (phone) addToMap(map, `phone:${phone}`, i);
      for (const p of c.properties) {
        const propPhone = normalizePhone(p.phone ?? null);
        if (propPhone) addToMap(map, `phone:${propPhone}`, i);
      }
    });
    connectByKeyMap(uf, map);
  }

  if (active.has('nameExact')) {
    const map = new Map<string, number[]>();
    clients.forEach((c, i) => {
      const name = normalizeName(c.name);
      if (name.length >= 3) addToMap(map, `name:${name}`, i);
    });
    connectByKeyMap(uf, map);
  }

  if (active.has('nameCity')) {
    const map = new Map<string, number[]>();
    clients.forEach((c, i) => {
      const name = normalizeName(c.name);
      const city = normalizeName(c.properties[0]?.city ?? '');
      if (name.length >= 3 && city) addToMap(map, `nameCity:${name}|${city}`, i);
    });
    connectByKeyMap(uf, map);
  }

  if (active.has('farmName')) {
    const map = new Map<string, number[]>();
    clients.forEach((c, i) => {
      for (const p of c.properties) {
        const key = normalizeFarmKey(p.farmName, p.city, p.state);
        if (key.split('|')[0]) addToMap(map, `farm:${key}`, i);
      }
    });
    connectByKeyMap(uf, map);
  }

  if (active.has('nameFuzzy')) {
    const buckets = new Map<string, number[]>();
    clients.forEach((c, i) => {
      const name = normalizeName(c.name);
      const bucket = nameBucketKey(name);
      if (bucket) addToMap(buckets, bucket, i);
    });
    for (const indices of buckets.values()) {
      if (indices.length < 2) continue;
      for (let a = 0; a < indices.length; a++) {
        for (let b = a + 1; b < indices.length; b++) {
          const i = indices[a];
          const j = indices[b];
          const sim = nameSimilarity(
            normalizeName(clients[i].name),
            normalizeName(clients[j].name),
          );
          if (sim >= FUZZY_THRESHOLD) uf.union(i, j);
        }
      }
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < clients.length; i++) {
    const root = uf.find(i);
    const list = groups.get(root) ?? [];
    list.push(i);
    groups.set(root, list);
  }

  const result: { indices: number[]; reasons: DuplicateMatchReason[] }[] =
    [];

  for (const indices of groups.values()) {
    if (indices.length < 2) continue;
    const subgroups = splitGroupByDistinctNames(clients, indices);
    for (const subIndices of subgroups) {
      if (subIndices.length < 2) continue;
      const reasons = detectGroupReasons(clients, subIndices, active);
      result.push({ indices: subIndices, reasons });
    }
  }

  result.sort((a, b) => b.indices.length - a.indices.length);
  return result;
}

/** Separa grupos onde nomes exatos diferentes indicam pessoas distintas (ex.: pai e filho com mesmo e-mail). */
function splitGroupByDistinctNames(
  clients: ClientForDuplicateMatch[],
  indices: number[],
): number[][] {
  const byName = new Map<string, number[]>();

  for (const i of indices) {
    const name = normalizeName(clients[i].name);
    if (name.length < 3) continue;
    const list = byName.get(name) ?? [];
    list.push(i);
    byName.set(name, list);
  }

  const clusters = [...byName.values()];

  if (clusters.length <= 1) {
    return indices.length >= 2 ? [indices] : [];
  }

  const mergeable = clusters.filter((c) => c.length >= 2);

  if (mergeable.length >= 2) {
    return mergeable;
  }

  if (mergeable.length === 1) {
    return mergeable;
  }

  return indices.length >= 2 ? [indices] : [];
}

function detectGroupReasons(
  clients: ClientForDuplicateMatch[],
  indices: number[],
  active: Set<DuplicateStrategy>,
): DuplicateMatchReason[] {
  const reasons = new Set<DuplicateMatchReason>();
  const subset = indices.map((i) => clients[i]);

  for (let a = 0; a < subset.length; a++) {
    for (let b = a + 1; b < subset.length; b++) {
      const ca = subset[a];
      const cb = subset[b];

      if (active.has('document')) {
        const da = digitsOnly(ca.document ?? '');
        const db = digitsOnly(cb.document ?? '');
        if (da.length >= 11 && da === db) reasons.add('document');
      }

      if (active.has('email')) {
        const ea = ca.email?.trim().toLowerCase();
        const eb = cb.email?.trim().toLowerCase();
        if (ea && ea === eb) reasons.add('email');
      }

      if (active.has('phone')) {
        const phonesA = collectPhones(ca);
        const phonesB = collectPhones(cb);
        if (phonesA.some((p) => phonesB.includes(p))) reasons.add('phone');
      }

      if (active.has('nameExact')) {
        const na = normalizeName(ca.name);
        const nb = normalizeName(cb.name);
        if (na.length >= 3 && na === nb) reasons.add('nameExact');
      }

      if (active.has('nameCity')) {
        const na = normalizeName(ca.name);
        const nb = normalizeName(cb.name);
        const caCity = normalizeName(ca.properties[0]?.city ?? '');
        const cbCity = normalizeName(cb.properties[0]?.city ?? '');
        if (na === nb && caCity && caCity === cbCity) reasons.add('nameCity');
      }

      if (active.has('farmName')) {
        const keysA = ca.properties.map((p) =>
          normalizeFarmKey(p.farmName, p.city, p.state),
        );
        const keysB = cb.properties.map((p) =>
          normalizeFarmKey(p.farmName, p.city, p.state),
        );
        if (keysA.some((k) => keysB.includes(k))) reasons.add('farmName');
      }

      if (active.has('nameFuzzy')) {
        const sim = nameSimilarity(
          normalizeName(ca.name),
          normalizeName(cb.name),
        );
        if (sim >= FUZZY_THRESHOLD) reasons.add('nameFuzzy');
      }
    }
  }

  return DUPLICATE_STRATEGIES.filter((s) => reasons.has(s));
}

function collectPhones(client: ClientForDuplicateMatch): string[] {
  const set = new Set<string>();
  const main = normalizePhone(client.phone);
  if (main) set.add(main);
  for (const p of client.properties) {
    const ph = normalizePhone(p.phone ?? null);
    if (ph) set.add(ph);
  }
  return [...set];
}
