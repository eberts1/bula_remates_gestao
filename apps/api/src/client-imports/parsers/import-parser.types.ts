import type { LivestockCategory } from '@docs/shared';

export interface ParsedImportRow {
  rowIndex: number;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  legacyCode: string | null;
  groupKey: string | null;
  property: {
    farmName: string;
    city: string;
    state: string;
    phone?: string;
    routeNotes?: string;
  };
  additionalProperties?: Array<{
    farmName: string;
    city: string;
    state: string;
    phone?: string;
    routeNotes?: string;
  }>;
  warnings: string[];
  needsReview: boolean;
}

export interface PdfParseMeta {
  parserId: string;
  sourceLabel: string;
  suggestedTags: {
    livestockCategory?: LivestockCategory;
  };
  columnMapping?: Record<string, number | undefined>;
}

export interface ParseFileResult {
  rows: ParsedImportRow[];
  meta: PdfParseMeta;
}
