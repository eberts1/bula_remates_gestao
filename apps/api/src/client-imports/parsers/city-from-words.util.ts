import { normalizeCityName } from '../../common/geo.util';
import { BRAZILIAN_CITIES } from '../../geo/brazilian-cities.data';

interface IndexedCity {
  name: string;
  normalized: string;
}

const byState = new Map<string, IndexedCity[]>();
const officialByKey = new Map<string, string>();

for (const [, name, state] of BRAZILIAN_CITIES) {
  const uf = state.toUpperCase();
  const normalized = normalizeCityName(name);
  const entry: IndexedCity = { name, normalized };
  const list = byState.get(uf);
  if (list) list.push(entry);
  else byState.set(uf, [entry]);
  officialByKey.set(`${normalized}|${uf}`, name);
}

/** Estados mais frequentes nas listagens ETB (Estância Bahia). */
export const ETB_IMPORT_STATES = [
  'PA', 'MT', 'MA', 'TO', 'RO', 'AP', 'RR', 'MG', 'GO', 'MS',
] as const;

let etbGluedCitiesCache: string[] | null = null;

/** Nomes normalizados de municípios IBGE, do maior ao menor (para colar tokens no PDF). */
export function getEtbGluedCityNames(): string[] {
  if (etbGluedCitiesCache) return etbGluedCitiesCache;
  const states = new Set<string>(ETB_IMPORT_STATES);
  etbGluedCitiesCache = BRAZILIAN_CITIES.filter(([, , s]) => states.has(s))
    .map(([, name]) => normalizeCityName(name))
    .filter((n) => n.includes(' '))
    .sort((a, b) => b.length - a.length);
  return etbGluedCitiesCache;
}

/** Maior sufixo de tokens que corresponde a um município IBGE na UF informada. */
export function findCitySuffixInWords(
  parts: string[],
  state: string,
): { cityPartCount: number; cityName: string } | null {
  const uf = state.trim().toUpperCase();
  if (!parts.length || !byState.has(uf)) return null;

  for (let n = Math.min(4, parts.length); n >= 1; n--) {
    const candidate = normalizeCityName(parts.slice(-n).join(' '));
    const official = officialByKey.get(`${candidate}|${uf}`);
    if (official) {
      return { cityPartCount: n, cityName: official };
    }
  }
  return null;
}

/**
 * Corrige cidade parcial (ex.: "Repartimento" → "Novo Repartimento") quando há
 * um único município na UF compatível.
 */
export function canonicalizeCity(city: string, state: string): string {
  const trimmed = city.trim();
  if (!trimmed || trimmed === '—') return trimmed;

  const uf = state.trim().toUpperCase();
  const normalized = normalizeCityName(trimmed);
  const exact = officialByKey.get(`${normalized}|${uf}`);
  if (exact) return exact;

  const list = byState.get(uf);
  if (!list) return trimmed;

  const endsWith = list.filter(
    (c) =>
      c.normalized === normalized ||
      c.normalized.endsWith(` ${normalized}`),
  );
  if (endsWith.length === 1) return endsWith[0].name;

  const lastWord = normalized.split(' ').pop() ?? normalized;
  const byFinalToken = list.filter((c) => {
    const words = c.normalized.split(' ');
    return words[words.length - 1] === lastWord;
  });
  if (byFinalToken.length === 1) return byFinalToken[0].name;

  return trimmed;
}
