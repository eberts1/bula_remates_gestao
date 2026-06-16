export interface AuctionListItem {
  id: string;
  name: string;
  scheduledAt: string | null;
  location: string | null;
  status: string;
  animalType: string | null;
  animalSex: string | null;
  livestockCategories: string[];
  targetIntentionCode: string | null;
  offersNotes: string | null;
  isBulaRemates: boolean;
  active: boolean;
  source?: string;
  externalKey?: string | null;
  includedCount: number;
  createdAt: string;
  updatedAt: string;
}

export type AuctionDetail = AuctionListItem;

export interface AuctionsListResponse {
  items: AuctionListItem[];
}

export interface AuctionMatchClient {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  animalType: string | null;
  animalSex: string | null;
  livestockCategory: string | null;
  responsible: { id: string; name: string } | null;
  intentions: Array<{ id: string; code: string; label: string }>;
  matchSource: string | null;
  matchStatus: string | null;
  matchNotes: string | null;
}

export interface AuctionMatchesResponse {
  suggested: AuctionMatchClient[];
  included: AuctionMatchClient[];
  manual: AuctionMatchClient[];
  counts: {
    suggested: number;
    included: number;
    excluded: number;
    manual: number;
  };
}

export interface AuctionFormValue {
  name: string;
  scheduledAt: string;
  location: string;
  status: string;
  animalType: string;
  animalSex: string;
  livestockCategories: string[];
  targetIntentionCode: string;
  offersNotes: string;
  isBulaRemates: boolean;
  active: boolean;
}

export function emptyAuctionForm(): AuctionFormValue {
  return {
    name: '',
    scheduledAt: '',
    location: '',
    status: 'agendado',
    animalType: '',
    animalSex: '',
    livestockCategories: [],
    targetIntentionCode: 'comprador',
    offersNotes: '',
    isBulaRemates: false,
    active: true,
  };
}

export function auctionToFormValue(auction: AuctionDetail): AuctionFormValue {
  return {
    name: auction.name,
    scheduledAt: auction.scheduledAt
      ? auction.scheduledAt.slice(0, 16)
      : '',
    location: auction.location ?? '',
    status: auction.status,
    animalType: auction.animalType ?? '',
    animalSex: auction.animalSex ?? '',
    livestockCategories: auction.livestockCategories ?? [],
    targetIntentionCode: auction.targetIntentionCode ?? 'comprador',
    offersNotes: auction.offersNotes ?? '',
    isBulaRemates: auction.isBulaRemates ?? false,
    active: auction.active,
  };
}
