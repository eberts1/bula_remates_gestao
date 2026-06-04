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
}

export type HygieneFilter = HygieneIssue | 'any';

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
