// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  buffer: Buffer,
) => Promise<{ text: string }>;
import type { LivestockCategory } from '@docs/shared';
import { extractPhonesFromTail, normalizePhone } from './phone.util';

const BRAZILIAN_STATES = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

const FARM_KEYWORD = /\b(FAZENDA|SITIO|SÍTIO|SITIO|AGROPECUARIA|AGROPECUÁRIA)\b/i;

export interface ParsedImportRow {
  rowIndex: number;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  property: {
    farmName: string;
    city: string;
    state: string;
    phone?: string;
  };
  warnings: string[];
  needsReview: boolean;
}

export interface PdfParseMeta {
  parserId: string;
  suggestedTags: {
    livestockCategory?: LivestockCategory;
  };
}

const UF_BEFORE_PHONE = Array.from(BRAZILIAN_STATES).join('|');

const COMMON_CITY_SUFFIXES = [
  'CONFRESA',
  'TEREZINHA',
  'XAVANTINA',
  'FLORESTA',
  'GARÇAS',
  'GARCAS',
  'CÁCERES',
  'CACERES',
  'VERDE',
  'ARAGUAIA',
  'XINGU',
  'BANDEIRANTES',
  'MUTUM',
  'RONDON',
  'PRIMAVERA',
];

function normalizePdfText(text: string): string {
  let t = text;
  t = t.replace(
    /(FAZENDA|SITIO|SÍTIO|SITIO|AGROPECUARIA|AGROPECUÁRIA)/gi,
    ' $1 ',
  );
  for (const city of COMMON_CITY_SUFFIXES) {
    t = t.replace(new RegExp(`([A-Z]{2,})(${city})(?=\\s|${UF_BEFORE_PHONE})`, 'gi'), '$1 $2 ');
  }
  t = t.replace(
    new RegExp(
      `([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-Za-záéíóúâêôãõç'.]{1,})(${UF_BEFORE_PHONE})(?=\\s*\\()`,
      'g',
    ),
    '$1 $2 ',
  );
  t = t.replace(/([A-Z]{2})\s*\(/g, '$1 (');
  return t.replace(/\s+/g, ' ').trim();
}

function splitGluedLines(text: string): string[] {
  return text
    .replace(/(\d)\s*(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ])/g, '$1\n')
    .split(/\n+/)
    .map((l) => normalizePdfText(l.trim()))
    .filter((l) => l.length > 10);
}

function inferTagsFromFileName(fileName: string): PdfParseMeta['suggestedTags'] {
  const lower = fileName.toLowerCase();
  const tags: PdfParseMeta['suggestedTags'] = {};
  if (lower.includes('touro')) tags.livestockCategory = 'touro';
  else if (lower.includes('vaca')) tags.livestockCategory = 'vaca';
  else if (lower.includes('novilha')) tags.livestockCategory = 'novilha';
  else if (lower.includes('bezerra')) tags.livestockCategory = 'bezerra';
  else if (lower.includes('bezerro')) tags.livestockCategory = 'bezerro';
  else if (lower.includes('garrote')) tags.livestockCategory = 'garrote';
  return tags;
}

function parseCityAndFarm(
  afterKeyword: string,
  farmKeyword: string,
): { farmName: string; city: string } {
  const parts = afterKeyword.trim().split(/\s+/).filter(Boolean);
  let cityParts = 1;
  if (
    parts.length >= 2 &&
    /^D['']?OESTE$/i.test(parts[parts.length - 1] ?? '')
  ) {
    cityParts = 2;
  }
  const city = parts.slice(-cityParts).join(' ');
  const farmRest = parts.slice(0, -cityParts).join(' ');
  const farmName = `${farmKeyword.toUpperCase()} ${farmRest}`.replace(/\s+/g, ' ').trim();
  return { farmName, city };
}

function parseLine(line: string, rowIndex: number): ParsedImportRow | null {
  const warnings: string[] = [];
  if (/^Nome\s+Fazenda/i.test(line)) return null;

  const { remainder: withoutPhones, phones } = extractPhonesFromTail(line);
  let remainder = withoutPhones;

  const stateMatch = remainder.match(/\s([A-Z]{2})\s*$/);
  if (!stateMatch || !BRAZILIAN_STATES.has(stateMatch[1])) {
    warnings.push('UF não identificada');
    return {
      rowIndex,
      name: line.slice(0, 80),
      document: null,
      email: null,
      phone: null,
      notes: null,
      property: { farmName: '', city: '', state: 'MT' },
      warnings,
      needsReview: true,
    };
  }

  const state = stateMatch[1];
  remainder = remainder.slice(0, -stateMatch[0].length).trim();

  const farmMatch = remainder.match(FARM_KEYWORD);
  if (!farmMatch || farmMatch.index === undefined) {
    warnings.push('Fazenda não identificada');
    return {
      rowIndex,
      name: remainder.slice(0, 80) || '—',
      document: null,
      email: null,
      phone: normalizePhone(phones[0] ?? null),
      notes: null,
      property: { farmName: '', city: '', state },
      warnings,
      needsReview: true,
    };
  }

  const name = remainder.slice(0, farmMatch.index).trim();
  const afterKeyword = remainder.slice(farmMatch.index + farmMatch[0].length).trim();
  const { farmName, city } = parseCityAndFarm(afterKeyword, farmMatch[0]);

  if (!name) warnings.push('Nome vazio');
  if (!city) warnings.push('Cidade não identificada');

  return {
    rowIndex,
    name: name || '—',
    document: null,
    email: null,
    phone: normalizePhone(phones[0] ?? null),
    notes: null,
    property: {
      farmName,
      city,
      state,
      phone: normalizePhone(phones[1] ?? null) ?? undefined,
    },
    warnings,
    needsReview: warnings.length > 0 || !name,
  };
}

export async function parsePdfTouroMt(
  buffer: Buffer,
  fileName: string,
): Promise<{ rows: ParsedImportRow[]; meta: PdfParseMeta }> {
  const { text } = await pdfParse(buffer);
  const lines = splitGluedLines(text);
  const rows: ParsedImportRow[] = [];

  let rowIndex = 0;
  for (const line of lines) {
    const parsed = parseLine(line, rowIndex);
    if (!parsed) continue;
    rows.push(parsed);
    rowIndex++;
  }

  return {
    rows,
    meta: {
      parserId: 'touro_mt_list',
      suggestedTags: inferTagsFromFileName(fileName),
    },
  };
}
