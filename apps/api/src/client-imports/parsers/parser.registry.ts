import type { ParseFileResult } from './import-parser.types';
import { detectEtbPdfText, parsePdfEtbEstancia } from './pdf-etb-estancia.parser';
import { parsePdfTouroMt } from './pdf-touro-mt.parser';
import { parseSpreadsheet, type ColumnMapping } from './spreadsheet.parser';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse') as (
  buffer: Buffer,
) => Promise<{ text: string }>;

export async function parseImportFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  columnMapping?: ColumnMapping,
): Promise<ParseFileResult> {
  const lower = fileName.toLowerCase();

  if (mimeType === 'application/pdf' || lower.endsWith('.pdf')) {
    const { text } = await pdfParse(buffer);
    if (detectEtbPdfText(text)) {
      return parsePdfEtbEstancia(buffer, fileName, text);
    }
    return parsePdfTouroMt(buffer, fileName, text);
  }

  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    /\.xlsx?$/i.test(lower) ||
    /\.csv$/i.test(lower)
  ) {
    const result = parseSpreadsheet(buffer, fileName, columnMapping);
    return {
      rows: result.rows.map((r) => ({
        ...r,
        legacyCode: null,
        groupKey: null,
      })),
      meta: {
        parserId: result.meta.parserId,
        sourceLabel: 'Planilha Excel',
        suggestedTags: result.meta.suggestedTags,
        columnMapping: result.meta.columnMapping as Record<
          string,
          number | undefined
        >,
      },
    };
  }

  throw new Error('Formato não suportado');
}

export type { ColumnMapping };
