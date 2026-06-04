import type { Client } from '@/types/client';

export type HygieneIssue = 'location' | 'tags' | 'incomplete';

export type LocationIssueKind = 'invalid_uf' | 'empty_city' | 'unknown_city';

export interface CityMatch {
  id: number;
  name: string;
  state: string;
}

export interface LocationProblem {
  propertyId: string;
  city: string;
  state: string;
  issue: LocationIssueKind;
  suggestions: CityMatch[];
}

export interface HygieneClient extends Client {
  issues: HygieneIssue[];
  locationProblems: LocationProblem[];
}

export interface HygieneListResponse {
  items: HygieneClient[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HygieneSummary {
  location: number;
  tags: number;
  incomplete: number;
  any: number;
  duplicateGroups?: number;
  duplicateClients?: number;
}

export type HygieneFilter = HygieneIssue | 'any' | 'duplicates';

export type DuplicateMatchReason =
  | 'document'
  | 'email'
  | 'phone'
  | 'nameExact'
  | 'nameFuzzy'
  | 'nameCity'
  | 'farmName';

export interface DuplicateGroup {
  id: string;
  reasons: DuplicateMatchReason[];
  clients: Client[];
}

export interface DuplicatesListResponse {
  groups: DuplicateGroup[];
  totalGroups: number;
  totalClients: number;
}

export interface MergeResolution {
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  addressFull?: string | null;
  animalType?: string | null;
  animalSex?: string | null;
  livestockCategory?: string | null;
  intentionIds?: string[];
  properties?: Client['properties'];
}

export const ISSUE_LABELS: Record<HygieneIssue, string> = {
  location: 'Localização',
  tags: 'Sem etiqueta',
  incomplete: 'Incompleto',
};

export const LOCATION_ISSUE_LABELS: Record<LocationIssueKind, string> = {
  invalid_uf: 'UF inválida',
  empty_city: 'Cidade vazia',
  unknown_city: 'Cidade não encontrada',
};

export const DUPLICATE_REASON_LABELS: Record<DuplicateMatchReason, string> = {
  document: 'Documento',
  email: 'E-mail',
  phone: 'Telefone',
  nameExact: 'Nome igual',
  nameFuzzy: 'Nome parecido',
  nameCity: 'Nome + cidade',
  farmName: 'Fazenda',
};
