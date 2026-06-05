'use client';

import Link from 'next/link';
import {
  ClientTagFilters,
  countActiveFilters,
  type TagFilterValues,
} from '@/components/clients/ClientTagFilters';
import type { TenantIntention } from '@/types/client-import';

interface Props {
  search: string;
  onSearchChange: (value: string) => void;
  tagFilters: TagFilterValues;
  onTagFiltersChange: (values: TagFilterValues) => void;
  intentions: TenantIntention[];
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onNewClient: () => void;
}

export function ClientToolbar({
  search,
  onSearchChange,
  tagFilters,
  onTagFiltersChange,
  intentions,
  filtersOpen,
  onToggleFilters,
  onNewClient,
}: Props) {
  const activeFilterCount = countActiveFilters(tagFilters);

  return (
    <div className="clients-toolbar">
      <div className="clients-toolbar-row">
        <label className="clients-search">
          <span className="sr-only">Buscar cliente</span>
          <input
            type="search"
            placeholder="Nome, telefone, CPF/CNPJ, DDD, cidade/UF da fazenda..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Buscar cliente"
          />
        </label>

        <div className="clients-toolbar-actions">
          <button
            type="button"
            className={`ghost clients-filter-toggle${filtersOpen ? ' active' : ''}`}
            onClick={onToggleFilters}
            aria-expanded={filtersOpen}
          >
            Filtros
            {activeFilterCount > 0 && (
              <span className="clients-filter-badge">{activeFilterCount}</span>
            )}
          </button>

          <button type="button" className="primary" onClick={onNewClient}>
            + Novo cliente
          </button>

          <Link href="/clients/import" className="ghost clients-import-link">
            Importar
          </Link>

          <Link href="/clients/hygiene" className="ghost clients-import-link">
            Higienizar
          </Link>

          <Link href="/clients/map" className="ghost clients-import-link">
            Mapa
          </Link>
        </div>
      </div>

      {filtersOpen && (
        <div className="clients-filter-panel">
          <ClientTagFilters
            values={tagFilters}
            intentions={intentions}
            onChange={onTagFiltersChange}
          />
        </div>
      )}
    </div>
  );
}
