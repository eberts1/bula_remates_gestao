import type { ClientExportPurpose } from '@docs/shared';

export interface ClientExportFilters {
  q?: string;
  animalType?: string;
  animalSex?: string;
  livestockCategory?: string;
  intentionId?: string;
  state?: string;
  ddd?: string;
  nearCity?: string;
  nearState?: string;
  radiusKm?: number;
  boundsSouth?: number;
  boundsNorth?: number;
  boundsWest?: number;
  boundsEast?: number;
  areaCenterLat?: number;
  areaCenterLng?: number;
  areaRadiusKm?: number;
}

export interface ClientExportRequest {
  filters?: ClientExportFilters;
  purpose: ClientExportPurpose;
  destination?: string;
  recipientName?: string;
  notes?: string;
}

export interface ClientExportBatchItem {
  id: string;
  purpose: ClientExportPurpose;
  destination: string | null;
  recipientName: string | null;
  notes: string | null;
  clientCount: number;
  filters: Record<string, string | number> | null;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
}

export interface ClientExportHistoryResponse {
  items: ClientExportBatchItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClientExportSummary {
  totalExports: number;
  totalClientsExported: number;
  exportsLast30Days: number;
  byPurpose: Array<{
    purpose: ClientExportPurpose;
    exportCount: number;
    clientCount: number;
  }>;
}

export interface ClientExportFormValues {
  purpose: ClientExportPurpose;
  destination: string;
  recipientName: string;
  notes: string;
}

export const EMPTY_EXPORT_FORM: ClientExportFormValues = {
  purpose: 'message_dispatcher',
  destination: '',
  recipientName: '',
  notes: '',
};
