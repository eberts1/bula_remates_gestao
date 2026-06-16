export interface ParsedAuctionImportRow {
  rowIndex: number;
  date: string;
  dayOfWeek: string;
  name: string;
  time: string;
  scheduledAt: string | null;
  animalType: string | null;
  animalSex: string | null;
  livestockCategories: string[];
}

export interface AuctionImportRow extends ParsedAuctionImportRow {
  selected: boolean;
}

export interface AuctionImportParseResponse {
  rows: ParsedAuctionImportRow[];
  meta: {
    parserId: string;
    fileName: string;
    defaultYear: number;
    columnMapping: Record<string, number | undefined>;
  };
}

export interface AuctionImportCommitResult {
  importedCount: number;
  fileName: string;
}

export type AuctionImportPhase = 'idle' | 'parsing' | 'preview' | 'committing' | 'done';

export function toAuctionImportRow(
  raw: ParsedAuctionImportRow,
): AuctionImportRow {
  return {
    ...raw,
    livestockCategories: [...(raw.livestockCategories ?? [])],
    selected: true,
  };
}
