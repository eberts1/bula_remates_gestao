import * as XLSX from 'xlsx';
import type { LivestockCategory } from '@docs/shared';
import { normalizePhone } from './phone.util';
import type { ParsedImportRow } from './pdf-touro-mt.parser';

const COLUMN_ALIASES: Record<string, string[]> = {
  name: ['nome', 'name', 'cliente', 'produtor', 'razao social'],
  farmName: ['fazenda', 'farm', 'propriedade', 'sitio', 'sítio'],
  city: ['cidade', 'city', 'municipio', 'município'],
  state: ['uf', 'state', 'estado'],
  phone: ['telefone', 'phone', 'celular', 'fone', 'tel'],
  phone2: ['telefone 2', 'telefone2', 'celular 2', 'fone 2'],
  document: ['documento', 'cpf', 'cnpj', 'doc'],
  email: ['email', 'e-mail'],
  notes: ['obs', 'observacao', 'observação', 'notas', 'notes'],
};

export interface ColumnMapping {
  name?: number;
  farmName?: number;
  city?: number;
  state?: number;
  phone?: number;
  phone2?: number;
  document?: number;
  email?: number;
  notes?: number;
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function detectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  headers.forEach((h, index) => {
    const norm = normalizeHeader(h);
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some((a) => norm === a || norm.includes(a))) {
        if (mapping[field as keyof ColumnMapping] === undefined) {
          mapping[field as keyof ColumnMapping] = index;
        }
      }
    }
  });
  return mapping;
}

function cell(row: unknown[], index?: number): string {
  if (index === undefined) return '';
  const v = row[index];
  if (v == null) return '';
  return String(v).trim();
}

export function parseSpreadsheet(
  buffer: Buffer,
  fileName: string,
  overrideMapping?: ColumnMapping,
): {
  rows: ParsedImportRow[];
  meta: { parserId: string; suggestedTags: { livestockCategory?: LivestockCategory }; columnMapping: ColumnMapping };
} {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '' }) as unknown[][];

  if (data.length < 2) {
    return {
      rows: [],
      meta: { parserId: 'spreadsheet', suggestedTags: {}, columnMapping: {} },
    };
  }

  const headers = (data[0] as unknown[]).map((h) => String(h ?? ''));
  const mapping = overrideMapping ?? detectMapping(headers);

  const rows: ParsedImportRow[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i] as unknown[];
    const name = cell(row, mapping.name);
    if (!name) continue;

    const state = cell(row, mapping.state).toUpperCase().slice(0, 2) || 'MT';
    const warnings: string[] = [];
    if (!cell(row, mapping.farmName)) warnings.push('Fazenda não informada');
    if (!cell(row, mapping.city)) warnings.push('Cidade não informada');

    rows.push({
      rowIndex: i - 1,
      name,
      document: cell(row, mapping.document) || null,
      email: cell(row, mapping.email) || null,
      phone: normalizePhone(cell(row, mapping.phone)),
      notes: cell(row, mapping.notes) || null,
      property: {
        farmName: cell(row, mapping.farmName) || '—',
        city: cell(row, mapping.city) || '—',
        state,
        phone: normalizePhone(cell(row, mapping.phone2)) ?? undefined,
      },
      warnings,
      needsReview: warnings.length > 0,
    });
  }

  const lower = fileName.toLowerCase();
  const suggestedTags: { livestockCategory?: LivestockCategory } = {};
  if (lower.includes('touro')) suggestedTags.livestockCategory = 'touro';

  return {
    rows,
    meta: {
      parserId: 'spreadsheet',
      suggestedTags,
      columnMapping: mapping,
    },
  };
}
