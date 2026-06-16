'use client';

import type { AttendanceFilters } from '@/types/attendance';
import type { AuctionListItem } from '@/types/auction';

export function countAttendanceFilters(values: AttendanceFilters): number {
  let count = 0;
  if (values.auctionId) count += 1;
  return count;
}

interface Props {
  values: AttendanceFilters;
  search: string;
  auctions: AuctionListItem[];
  onSearchChange: (value: string) => void;
  onChange: (values: AttendanceFilters) => void;
}

export function AttendanceFilters({
  values,
  search,
  auctions,
  onSearchChange,
  onChange,
}: Props) {
  function set(field: keyof AttendanceFilters, value: string) {
    onChange({ ...values, [field]: value });
  }

  return (
    <div className="attendance-filters card">
      <div className="attendance-filters-row">
        <label className="attendance-filter-search">
          Buscar
          <input
            type="search"
            placeholder="Nome, telefone, e-mail..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </label>

        <label>
          Leilão
          <select
            value={values.auctionId}
            onChange={(e) => set('auctionId', e.target.value)}
          >
            <option value="">Todos</option>
            {auctions.map((auction) => (
              <option key={auction.id} value={auction.id}>
                {auction.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
