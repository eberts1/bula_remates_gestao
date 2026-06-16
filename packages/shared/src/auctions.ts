export const AUCTION_STATUSES = ['agendado', 'realizado', 'cancelado'] as const;

export type AuctionStatus = (typeof AUCTION_STATUSES)[number];

export const AUCTION_MATCH_STATUSES = ['included', 'excluded'] as const;

export type AuctionMatchStatus = (typeof AUCTION_MATCH_STATUSES)[number];

export const AUCTION_MATCH_SOURCES = ['auto', 'manual'] as const;

export type AuctionMatchSource = (typeof AUCTION_MATCH_SOURCES)[number];

export const AUCTION_STATUS_LABELS: Record<AuctionStatus, string> = {
  agendado: 'Agendado',
  realizado: 'Realizado',
  cancelado: 'Cancelado',
};

export const DEFAULT_AUCTION_TARGET_INTENTION = 'comprador';

export const AUCTION_SOURCES = ['manual', 'sheet'] as const;

export type AuctionSource = (typeof AUCTION_SOURCES)[number];

export const DEFAULT_AUCTION_SCHEDULE_SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1ghY8TaAfZ2kZyPZXgz3TCUHT6zJFfjgLruDd2qpPsBI/export?format=csv&gid=0';

/** Detecta leilões da leiloeira Bula Remates pelo nome ou coluna leiloeira. */
export function detectIsBulaRemates(
  name: string,
  auctioneer?: string | null,
): boolean {
  const normalized = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '');

  const haystack = [name, auctioneer ?? ''].map(normalized).join(' ');
  return haystack.includes('bula remates') || haystack.includes('bula remate');
}
