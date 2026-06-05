/**
 * Mescla o catalogo IBGE atual com centroides de municipios (kelvins/Municipios-Brasileiros).
 * Uso: node apps/api/scripts/generate-city-coords.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../src/geo/brazilian-cities.data.ts');
const CSV_URL =
  'https://raw.githubusercontent.com/kelvins/Municipios-Brasileiros/main/csv/municipios.csv';

const UF_BY_CODE = {
  11: 'RO',
  12: 'AC',
  13: 'AM',
  14: 'RR',
  15: 'PA',
  16: 'AP',
  17: 'TO',
  21: 'MA',
  22: 'PI',
  23: 'CE',
  24: 'RN',
  25: 'PB',
  26: 'PE',
  27: 'AL',
  28: 'SE',
  29: 'BA',
  31: 'MG',
  32: 'ES',
  33: 'RJ',
  35: 'SP',
  41: 'PR',
  42: 'SC',
  43: 'RS',
  50: 'MS',
  51: 'MT',
  52: 'GO',
  53: 'DF',
};

function parseExistingCities(source) {
  const tuples = [];
  const re = /\[(\d+),\s*"([^"]+)",\s*"([A-Z]{2})"\]/g;
  let m;
  while ((m = re.exec(source)) !== null) {
    tuples.push([Number(m[1]), m[2], m[3]]);
  }
  return tuples;
}

function parseCsv(text) {
  const lines = text.trim().split('\n');
  const header = lines[0].split(',');
  const idx = {
    id: header.indexOf('codigo_ibge'),
    lat: header.indexOf('latitude'),
    lng: header.indexOf('longitude'),
    uf: header.indexOf('codigo_uf'),
  };

  const byId = new Map();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const id = Number(cols[idx.id]);
    const lat = Number(cols[idx.lat]);
    const lng = Number(cols[idx.lng]);
    const ufCode = Number(cols[idx.uf]);
    const state = UF_BY_CODE[ufCode];
    if (!state || Number.isNaN(lat) || Number.isNaN(lng)) continue;
    byId.set(id, { lat, lng, state });
  }
  return byId;
}

const existingSource = readFileSync(dataPath, 'utf8');
const cities = parseExistingCities(existingSource);

const csvText = await fetch(CSV_URL).then((r) => {
  if (!r.ok) throw new Error(`Falha ao baixar CSV: ${r.status}`);
  return r.text();
});
const coordsById = parseCsv(csvText);

let missing = 0;
const enriched = cities.map(([id, name, state]) => {
  const coords = coordsById.get(id);
  if (!coords) {
    missing += 1;
    return [id, name, state, null, null];
  }
  return [id, name, state, coords.lat, coords.lng];
});

if (missing > 0) {
  console.warn(`Aviso: ${missing} municipios sem coordenadas no dataset externo.`);
}

const lines = enriched.map(([id, name, state, lat, lng]) => {
  if (lat == null || lng == null) {
    return `  [${id}, "${name}", "${state}", null, null],`;
  }
  return `  [${id}, "${name}", "${state}", ${lat}, ${lng}],`;
});

const output = `// Catalogo de municipios brasileiros (IBGE). Gerado automaticamente - nao editar a mao.
// Fonte: https://servicodados.ibge.gov.br/api/v1/localidades/municipios
// Coordenadas: https://github.com/kelvins/Municipios-Brasileiros

export type BrazilianCityTuple = [id: number, name: string, state: string, latitude: number | null, longitude: number | null];

export const BRAZILIAN_CITIES: BrazilianCityTuple[] = [
${lines.join('\n')}
];
`;

writeFileSync(dataPath, output, 'utf8');
console.log(`Atualizado ${enriched.length} municipios em ${dataPath}`);
