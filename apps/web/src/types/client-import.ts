import type {
  AnimalSex,
  AnimalType,
  ImportResolution,
  LivestockCategory,
} from '@docs/shared';

export interface TenantIntention {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
}

export interface ImportConflict {
  clientId: string;
  matchReason: 'document' | 'phone' | 'name_city';
  existing: {
    id: string;
    name: string;
    document: string | null;
    phone: string | null;
    city: string | null;
  };
}

export interface ImportRow {
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
    routeNotes?: string;
    ie?: string;
    nirf?: string;
  };
  animalType: AnimalType | null;
  animalSex: AnimalSex | null;
  livestockCategory: LivestockCategory | null;
  intentionIds: string[];
  intentionNotes: string | null;
  warnings: string[];
  needsReview: boolean;
  conflict: ImportConflict | null;
  selected: boolean;
  resolution: ImportResolution;
  conflictClientId?: string;
}

export interface BatchTags {
  animalType: AnimalType | '';
  animalSex: AnimalSex | '';
  livestockCategory: LivestockCategory | '';
  intentionIds: string[];
  intentionNotes: string;
}

export interface ParseImportResponse {
  fileName: string;
  mimeType: string;
  sourceType: string;
  suggestedTags: { livestockCategory?: LivestockCategory };
  columnMapping?: Record<string, number | undefined>;
  rows: Omit<ImportRow, 'selected' | 'resolution'>[];
  total: number;
}

export interface CommitImportResult {
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
}
