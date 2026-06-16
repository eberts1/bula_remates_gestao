import type { AuctionListItem } from '@/types/auction';

export interface AuctionListFilters {
  q: string;
  status: string;
  animalType: string;
  bulaOnly: boolean;
}

export function emptyAuctionListFilters(): AuctionListFilters {
  return { q: '', status: '', animalType: '', bulaOnly: false };
}

export function filterAuctions(
  items: AuctionListItem[],
  filters: AuctionListFilters,
): AuctionListItem[] {
  const query = filters.q.trim().toLowerCase();

  return items.filter((auction) => {
    if (filters.bulaOnly && !auction.isBulaRemates) return false;
    if (filters.status && auction.status !== filters.status) return false;
    if (filters.animalType && auction.animalType !== filters.animalType) {
      return false;
    }
    if (!query) return true;

    const haystack = [
      auction.name,
      auction.location ?? '',
      auction.offersNotes ?? '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function groupAuctionsByDate(items: AuctionListItem[]) {
  const groups = new Map<string, AuctionListItem[]>();

  for (const auction of items) {
    const key = auction.scheduledAt
      ? auction.scheduledAt.slice(0, 10)
      : 'sem-data';
    const bucket = groups.get(key) ?? [];
    bucket.push(auction);
    groups.set(key, bucket);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => {
      if (a === 'sem-data') return 1;
      if (b === 'sem-data') return -1;
      return a.localeCompare(b);
    })
    .map(([dateKey, auctions]) => ({
      dateKey,
      label: formatGroupLabel(dateKey, auctions[0]?.scheduledAt ?? null),
      auctions,
    }));
}

function formatGroupLabel(dateKey: string, scheduledAt: string | null) {
  if (dateKey === 'sem-data') return 'Sem data definida';

  const date = scheduledAt ? new Date(scheduledAt) : new Date(`${dateKey}T12:00:00`);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export function formatAuctionDateBadge(scheduledAt: string | null) {
  if (!scheduledAt) {
    return { day: '--', month: '---' };
  }

  const date = new Date(scheduledAt);
  return {
    day: date.toLocaleDateString('pt-BR', { day: '2-digit' }),
    month: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
  };
}

export function formatAuctionTime(scheduledAt: string | null) {
  if (!scheduledAt) return 'Horário não definido';
  return new Date(scheduledAt).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
