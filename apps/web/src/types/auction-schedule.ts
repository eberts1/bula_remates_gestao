export interface AuctionScheduleRow {
  rowIndex: number;
  date: string;
  dayOfWeek: string;
  name: string;
  time: string;
  scheduledAt: string | null;
  animalType: string | null;
  animalSex: string | null;
  livestockCategories: string[];
  auctioneer: string | null;
  isBulaRemates: boolean;
  externalKey: string;
  alreadyImported: boolean;
  auctionId: string | null;
}

export interface AuctionScheduleResponse {
  rows: AuctionScheduleRow[];
  meta: {
    parserId: string;
    fileName: string;
    defaultYear: number;
    csvUrl: string;
    importedCount: number;
    pendingCount: number;
  };
}

export interface ImportScheduleResult {
  importedCount: number;
  skippedCount: number;
  items: Array<{ id: string; name: string }>;
}

export interface CreateAuctionAttendanceResult {
  createdCount: number;
  skippedCount: number;
  created: Array<{ id: string; title: string; client: { id: string; name: string } }>;
  skipped: Array<{ clientId: string; actionId: string }>;
}
