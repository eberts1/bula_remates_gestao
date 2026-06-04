import type { CommitImportResult } from '@/types/client-import';

export const IMPORT_RESUME_KEY = 'client-import-resume';

export interface ImportCommitPayloadRow {
  rowIndex: number;
  name: string;
  document: string | null;
  legacyCode: string | null;
  groupKey: string | null;
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
  additionalProperties?: Array<{
    farmName: string;
    city: string;
    state: string;
    phone?: string;
    routeNotes?: string;
  }>;
  animalType: string | null;
  animalSex: string | null;
  livestockCategory: string | null;
  intentionIds: string[];
  intentionNotes: string | null;
  resolution: string;
  conflictClientId?: string;
  selected: boolean;
}

export interface ImportResumeState {
  fileMeta: {
    fileName: string;
    mimeType: string;
    sourceType: string;
    sourceLabel?: string;
  };
  payloadRows: ImportCommitPayloadRow[];
  nextChunkIndex: number;
  totals: CommitImportResult;
  updatedAt: number;
}

export function loadImportResume(): ImportResumeState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(IMPORT_RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImportResumeState;
    if (!parsed?.fileMeta || !Array.isArray(parsed.payloadRows)) return null;
    if (parsed.nextChunkIndex >= parsed.payloadRows.length) {
      clearImportResume();
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveImportResume(state: ImportResumeState): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      IMPORT_RESUME_KEY,
      JSON.stringify({ ...state, updatedAt: Date.now() }),
    );
  } catch {
    /* quota exceeded — ignore */
  }
}

export function clearImportResume(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(IMPORT_RESUME_KEY);
}
