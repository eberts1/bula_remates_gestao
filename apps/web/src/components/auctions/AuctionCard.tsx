'use client';

import { AUCTION_STATUS_LABELS } from '@docs/shared';
import {
  ANIMAL_SEX_LABELS,
  ANIMAL_TYPE_LABELS,
  CATEGORY_LABELS,
} from '@/components/clients/ClientTagsSection';
import {
  formatAuctionDateBadge,
  formatAuctionTime,
} from '@/lib/auction-list-utils';
import type { AuctionListItem } from '@/types/auction';

interface Props {
  auction: AuctionListItem;
  onEdit: (id: string) => void;
  onMatch: (auction: AuctionListItem) => void;
}

function TagPills({ auction }: { auction: AuctionListItem }) {
  const pills: string[] = [];

  if (auction.animalType) {
    pills.push(ANIMAL_TYPE_LABELS[auction.animalType] ?? auction.animalType);
  }
  if (auction.animalSex) {
    pills.push(ANIMAL_SEX_LABELS[auction.animalSex] ?? auction.animalSex);
  }
  for (const category of auction.livestockCategories) {
    pills.push(CATEGORY_LABELS[category] ?? category);
  }

  if (pills.length === 0) {
    return (
      <span className="auction-tag-pill auction-tag-pill--muted">
        Sem filtros de match
      </span>
    );
  }

  return (
    <>
      {pills.map((pill) => (
        <span key={pill} className="auction-tag-pill">
          {pill}
        </span>
      ))}
    </>
  );
}

export function AuctionCard({ auction, onEdit, onMatch }: Props) {
  const dateBadge = formatAuctionDateBadge(auction.scheduledAt);
  const cardClass = [
    'auction-card',
    'card',
    auction.isBulaRemates ? 'auction-card--bula' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={cardClass}>
      {auction.isBulaRemates && (
        <div className="auction-bula-ribbon" aria-label="Leilão Bula Remates">
          Bula Remates
        </div>
      )}

      <div className="auction-card-top">
        <div
          className={`auction-date-badge${auction.isBulaRemates ? ' auction-date-badge--bula' : ''}`}
          aria-hidden="true"
        >
          <span className="auction-date-badge-day">{dateBadge.day}</span>
          <span className="auction-date-badge-month">{dateBadge.month}</span>
        </div>

        <div className="auction-card-main">
          <div className="auction-card-header">
            <div>
              <h3>{auction.name}</h3>
              <p className="auction-card-meta">
                {formatAuctionTime(auction.scheduledAt)}
              </p>
            </div>
            <span className={`auction-status auction-status--${auction.status}`}>
              {AUCTION_STATUS_LABELS[
                auction.status as keyof typeof AUCTION_STATUS_LABELS
              ] ?? auction.status}
            </span>
          </div>

          {auction.location && (
            <p className="auction-card-location">{auction.location}</p>
          )}

          <div className="auction-card-tags">
            <TagPills auction={auction} />
          </div>

          {auction.offersNotes && (
            <p className="auction-card-notes">{auction.offersNotes}</p>
          )}
        </div>
      </div>

      <div className="auction-card-footer">
        <div className="auction-card-stats">
          <strong>{auction.includedCount}</strong>
          <span>meu(s) cliente(s)</span>
        </div>
        <div className="auction-card-actions">
          <button type="button" className="ghost" onClick={() => onEdit(auction.id)}>
            Editar
          </button>
          <button type="button" onClick={() => onMatch(auction)}>
            Meus clientes
          </button>
        </div>
      </div>
    </article>
  );
}
