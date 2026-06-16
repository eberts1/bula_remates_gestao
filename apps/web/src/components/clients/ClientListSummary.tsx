'use client';

import type { ClientListItem } from '@/types/client';

interface Props {
  total: number;
  clients: ClientListItem[];
  page: number;
  limit: number;
  totalPages: number;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
}

export function ClientListSummary({
  total,
  clients,
  page,
  limit,
  totalPages,
  hasActiveFilters,
  onClearFilters,
}: Props) {
  const incomplete = clients.filter((c) => !c.isComplete).length;
  const active = clients.filter((c) => c.active).length;
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  const paginated = totalPages > 1;

  return (
    <div className="clients-summary">
      <div className="clients-summary-stats">
        <span>
          <strong>{total}</strong> cliente{total !== 1 ? 's' : ''} encontrado
          {total !== 1 ? 's' : ''}
        </span>
        {total > 0 && (
          <>
            <span className="clients-summary-sep">·</span>
            <span>
              {incomplete} incompleto{incomplete !== 1 ? 's' : ''}
              {paginated ? ' nesta página' : ''}
            </span>
            <span className="clients-summary-sep">·</span>
            <span>
              {active} ativo{active !== 1 ? 's' : ''}
              {paginated ? ' nesta página' : ''}
            </span>
          </>
        )}
        {paginated && total > 0 && (
          <>
            <span className="clients-summary-sep">·</span>
            <span className="clients-summary-range">
              Mostrando {from}–{to}
            </span>
          </>
        )}
      </div>

      {hasActiveFilters && (
        <button type="button" className="ghost clients-clear-filters" onClick={onClearFilters}>
          Limpar filtros
        </button>
      )}
    </div>
  );
}
