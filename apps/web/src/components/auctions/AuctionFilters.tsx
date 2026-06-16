'use client';

import { ANIMAL_TYPES, AUCTION_STATUSES, AUCTION_STATUS_LABELS } from '@docs/shared';
import { ANIMAL_TYPE_LABELS } from '@/components/clients/ClientTagsSection';
import type { AuctionListFilters } from '@/lib/auction-list-utils';

interface Props {
  value: AuctionListFilters;
  onChange: (value: AuctionListFilters) => void;
}

export function AuctionFilters({ value, onChange }: Props) {
  function set<K extends keyof AuctionListFilters>(
    field: K,
    fieldValue: AuctionListFilters[K],
  ) {
    onChange({ ...value, [field]: fieldValue });
  }

  return (
    <div className="auction-filters card">
      <label>
        Buscar
        <input
          type="search"
          value={value.q}
          onChange={(e) => set('q', e.target.value)}
          placeholder="Nome, local ou ofertas..."
        />
      </label>

      <label>
        Status
        <select
          value={value.status}
          onChange={(e) => set('status', e.target.value)}
        >
          <option value="">Todos</option>
          {AUCTION_STATUSES.map((status) => (
            <option key={status} value={status}>
              {AUCTION_STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </label>

      <label>
        Tipo
        <select
          value={value.animalType}
          onChange={(e) => set('animalType', e.target.value)}
        >
          <option value="">Todos</option>
          {ANIMAL_TYPES.map((type) => (
            <option key={type} value={type}>
              {ANIMAL_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </label>
      <label className="auction-filter-bula">
        <input
          type="checkbox"
          checked={value.bulaOnly}
          onChange={(e) => set('bulaOnly', e.target.checked)}
        />
        Somente Bula Remates
      </label>
    </div>
  );
}
