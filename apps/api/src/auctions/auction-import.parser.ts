import * as XLSX from 'xlsx';
import type { AnimalSex, AnimalType, LivestockCategory } from '@docs/shared';
import { ANIMAL_SEXES, ANIMAL_TYPES, LIVESTOCK_CATEGORIES, detectIsBulaRemates } from '@docs/shared';

export const DEFAULT_AUCTION_IMPORT_YEAR = 2026;

export interface ParsedAuctionImportRow {
  rowIndex: number;
  date: string;
  dayOfWeek: string;
  name: string;
  time: string;
  scheduledAt: string | null;
  animalType: AnimalType | null;
  animalSex: AnimalSex | null;
  livestockCategories: LivestockCategory[];
  auctioneer: string | null;
  isBulaRemates: boolean;
}

export interface AuctionImportColumnMapping {
  date?: number;
  dayOfWeek?: number;
  name?: number;
  time?: number;
  animalType?: number;
  animalSex?: number;
  auctioneer?: number;
}

const COLUMN_ALIASES: Record<keyof AuctionImportColumnMapping, string[]> = {
  date: ['mes', 'mês', 'dia', 'data', 'mes/dia', 'mês/dia'],
  dayOfWeek: ['dia da semana', 'dia semana'],
  name: ['leilao', 'leilão', 'nome', 'evento'],
  time: ['hora', 'horario', 'horário'],
  animalType: ['tipo'],
  animalSex: ['sexo'],
  auctioneer: ['leiloeira', 'leiloeiro', 'empresa'],
};

/** Layout padrão da planilha ESCALA LEILÕES (colunas A–K). */
const DEFAULT_COLUMN_MAPPING: AuctionImportColumnMapping = {
  date: 0,
  dayOfWeek: 1,
  name: 2,
  time: 3,
  animalType: 4,
  animalSex: 5,
  auctioneer: 6,
};

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function detectMapping(headers: string[]): AuctionImportColumnMapping {
  const mapping: AuctionImportColumnMapping = {};
  headers.forEach((h, index) => {
    const norm = normalizeHeader(h);
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (
        aliases.some((alias) => norm === alias || norm.includes(alias)) &&
        mapping[field as keyof AuctionImportColumnMapping] === undefined
      ) {
        mapping[field as keyof AuctionImportColumnMapping] = index;
      }
    }
  });
  return { ...DEFAULT_COLUMN_MAPPING, ...mapping };
}

function cell(row: unknown[], index?: number): string {
  if (index === undefined) return '';
  const v = row[index];
  if (v == null) return '';
  return String(v).trim();
}

function isDateCell(value: string): boolean {
  return /^\d{1,2}\/\d{1,2}$/.test(value.trim());
}

function normalizeToken(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

export function parseTimeValue(timeStr: string): { hours: number; minutes: number } {
  const t = timeStr.trim();
  if (!t) return { hours: 0, minutes: 0 };

  const colonMatch = t.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    return {
      hours: Number.parseInt(colonMatch[1], 10) || 0,
      minutes: Number.parseInt(colonMatch[2], 10) || 0,
    };
  }

  const num = Number.parseInt(t, 10);
  if (!Number.isNaN(num)) {
    return { hours: num, minutes: 0 };
  }

  return { hours: 0, minutes: 0 };
}

export function buildScheduledAt(
  dateStr: string,
  timeStr: string,
  year = DEFAULT_AUCTION_IMPORT_YEAR,
): string | null {
  const match = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  const { hours, minutes } = parseTimeValue(timeStr);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

export function mapAnimalType(raw: string): AnimalType | null {
  const normalized = normalizeToken(raw);
  if (normalized === 'CORTE') return 'corte';
  if (normalized === 'PO') return 'elite';
  return null;
}

export function mapAnimalSex(raw: string): AnimalSex | null {
  const normalized = normalizeToken(raw);
  if (!normalized) return null;

  if (/^(M\/F|F\/M|M \/ F|MACHO \/ FEMEA)$/.test(normalized)) {
    return null;
  }

  if (/^(TOUROS|MACHOS|MACHO)$/.test(normalized)) return 'macho';
  if (/^(FEMEAS|FEMEA)$/.test(normalized)) return 'femea';

  if (normalized.includes('FEMEA')) return 'femea';
  if (normalized.includes('MACHO') || normalized.includes('TOURO')) return 'macho';

  return null;
}

export function suggestCategoriesFromSex(raw: string): LivestockCategory[] {
  const normalized = normalizeToken(raw);
  if (normalized.includes('TOURO')) return ['touro'];
  return [];
}

export function buildAuctionExternalKey(
  name: string,
  scheduledAt: string | Date | null,
): string {
  const normalizedName = name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');

  if (!scheduledAt) return normalizedName;

  const date =
    typeof scheduledAt === 'string' ? new Date(scheduledAt) : scheduledAt;
  if (Number.isNaN(date.getTime())) return normalizedName;

  const dateKey = date.toISOString().slice(0, 10);
  return `${dateKey}|${normalizedName}`;
}

function isValidAnimalType(value: string | null): value is AnimalType {
  return value != null && (ANIMAL_TYPES as readonly string[]).includes(value);
}

function isValidAnimalSex(value: string | null): value is AnimalSex {
  return value != null && (ANIMAL_SEXES as readonly string[]).includes(value);
}

function isValidCategory(value: string): value is LivestockCategory {
  return (LIVESTOCK_CATEGORIES as readonly string[]).includes(value);
}

export function parseAuctionSpreadsheet(
  buffer: Buffer,
  fileName: string,
  year = DEFAULT_AUCTION_IMPORT_YEAR,
): {
  rows: ParsedAuctionImportRow[];
  meta: {
    parserId: string;
    fileName: string;
    defaultYear: number;
    columnMapping: AuctionImportColumnMapping;
  };
} {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];

  if (data.length < 2) {
    return {
      rows: [],
      meta: {
        parserId: 'auction-schedule',
        fileName,
        defaultYear: year,
        columnMapping: DEFAULT_COLUMN_MAPPING,
      },
    };
  }

  const headers = (data[0] as unknown[]).map((h) => String(h ?? ''));
  const mapping = detectMapping(headers);
  const rows: ParsedAuctionImportRow[] = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    const name = cell(row, mapping.name);
    if (!name) continue;

    const date = cell(row, mapping.date);
    if (!isDateCell(date)) continue;

    const time = cell(row, mapping.time);
    const animalTypeRaw = cell(row, mapping.animalType);
    const animalSexRaw = cell(row, mapping.animalSex);
    const auctioneerRaw = cell(row, mapping.auctioneer);
    const animalType = mapAnimalType(animalTypeRaw);
    const animalSex = mapAnimalSex(animalSexRaw);
    const livestockCategories = suggestCategoriesFromSex(animalSexRaw);
    const auctioneer = auctioneerRaw || null;

    rows.push({
      rowIndex: i - 1,
      date,
      dayOfWeek: cell(row, mapping.dayOfWeek),
      name,
      time,
      scheduledAt: buildScheduledAt(date, time, year),
      animalType: isValidAnimalType(animalType) ? animalType : null,
      animalSex: isValidAnimalSex(animalSex) ? animalSex : null,
      livestockCategories: livestockCategories.filter(isValidCategory),
      auctioneer,
      isBulaRemates: detectIsBulaRemates(name, auctioneer),
    });
  }

  return {
    rows,
    meta: {
      parserId: 'auction-schedule',
      fileName,
      defaultYear: year,
      columnMapping: mapping,
    },
  };
}
