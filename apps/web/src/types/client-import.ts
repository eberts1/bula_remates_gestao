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

export type ImportMatchReason =
  | 'legacy_code'
  | 'document'
  | 'email'
  | 'phone'
  | 'name_city';

export interface ImportConflict {
  clientId: string;
  matchReason: ImportMatchReason;
  existing: {
    id: string;
    name: string;
    document: string | null;
    phone: string | null;
    email: string | null;
    city: string | null;
    legacyCode: string | null;
  };
}

export interface ImportRow {
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
    ie?: string;
    nirf?: string;
  };
  additionalProperties?: Array<{
    farmName: string;
    city: string;
    state: string;
    phone?: string;
    routeNotes?: string;
  }>;
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
  sourceLabel?: string;
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

export type ImportPhase = 'idle' | 'parsing' | 'committing';

export interface ImportProgressState {
  phase: ImportPhase;
  current: number;
  total: number;
  label: string;
  indeterminate?: boolean;
  importedCount?: number;
  updatedCount?: number;
  skippedCount?: number;
}

const STRONG_MATCH: ImportMatchReason[] = ['legacy_code', 'document', 'email'];

export function isStrongConflict(conflict: ImportConflict | null): boolean {
  return Boolean(
    conflict && STRONG_MATCH.includes(conflict.matchReason),
  );
}

export function defaultResolutionForRow(
  conflict: ImportConflict | null,
): { resolution: ImportResolution; conflictClientId?: string } {
  if (!conflict) return { resolution: 'create' };
  if (isStrongConflict(conflict)) {
    return { resolution: 'update', conflictClientId: conflict.clientId };
  }
  return { resolution: 'create' };
}

export function formatPropertyLabel(prop: {
  farmName: string;
  city: string;
  state: string;
  routeNotes?: string | null;
}): string {
  if (prop.routeNotes?.trim()) return prop.routeNotes.trim();
  const farm = prop.farmName.trim();
  const city = prop.city.trim();
  const uf = prop.state.trim();
  if (!farm || farm === '—') return city && uf ? `${city} ${uf}` : '—';
  if (!city || city === '—') return `${farm} ${uf}`.trim();
  return `${farm} - ${city} ${uf}`.trim();
}

export function defaultSelectedForRow(
  raw: { needsReview: boolean; conflict: ImportConflict | null },
): boolean {
  if (raw.needsReview) return false;
  if (!raw.conflict) return true;
  return isStrongConflict(raw.conflict);
}
