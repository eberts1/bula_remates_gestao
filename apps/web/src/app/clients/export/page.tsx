'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { BRAZIL_STATES } from '@/components/clients/CityUfField';
import { ClientExportPreviewTable } from '@/components/clients/ClientExportPreviewTable';
import { ClientListSummary } from '@/components/clients/ClientListSummary';
import {
  ClientTagFilters,
  countActiveFilters,
  emptyTagFilters,
  type TagFilterValues,
} from '@/components/clients/ClientTagFilters';
import type { Client } from '@/types/client';
import type { TenantIntention } from '@/types/client-import';

const PREVIEW_LIMIT = 500;

function buildFilterParams(
  tagFilters: TagFilterValues,
  stateFilter: string,
  dddFilter: string,
  search: string,
) {
  const params = new URLSearchParams();

  if (search.trim()) params.set('q', search.trim());
  if (tagFilters.animalType) params.set('animalType', tagFilters.animalType);
  if (tagFilters.animalSex) params.set('animalSex', tagFilters.animalSex);
  if (tagFilters.livestockCategory) {
    params.set('livestockCategory', tagFilters.livestockCategory);
  }
  if (tagFilters.intentionId) params.set('intentionId', tagFilters.intentionId);
  if (stateFilter) params.set('state', stateFilter);
  if (dddFilter) params.set('ddd', dddFilter);

  return params;
}

export default function ClientExportPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tagFilters, setTagFilters] = useState<TagFilterValues>(emptyTagFilters());
  const [stateFilter, setStateFilter] = useState('');
  const [dddFilter, setDddFilter] = useState('');
  const [debouncedDdd, setDebouncedDdd] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(true);

  const [intentions, setIntentions] = useState<TenantIntention[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/tenant-intentions')
      .then((r) => r.json())
      .then((data) => setIntentions(data.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedDdd(dddFilter), 300);
    return () => clearTimeout(timer);
  }, [dddFilter]);

  const filterParams = useMemo(
    () =>
      buildFilterParams(tagFilters, stateFilter, debouncedDdd, debouncedSearch),
    [tagFilters, stateFilter, debouncedDdd, debouncedSearch],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams(filterParams);
      params.set('page', '1');
      params.set('limit', String(PREVIEW_LIMIT));

      const res = await fetch(`/api/clients?${params}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? 'Erro ao carregar clientes');
        setClients([]);
        setTotal(0);
        return;
      }

      setClients(data.items ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError('Erro ao carregar clientes');
      setClients([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filterParams]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    Boolean(stateFilter) ||
    Boolean(debouncedDdd) ||
    countActiveFilters(tagFilters) > 0;

  function clearFilters() {
    setSearch('');
    setTagFilters(emptyTagFilters());
    setStateFilter('');
    setDddFilter('');
  }

  async function handleExport() {
    setExporting(true);
    setError('');

    try {
      const query = filterParams.toString();
      const res = await fetch(`/api/clients/export${query ? `?${query}` : ''}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { message?: string }).message ?? 'Erro ao exportar arquivo',
        );
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get('content-disposition') ?? '';
      const match = disposition.match(/filename="?([^"]+)"?/i);
      const filename = match?.[1] ?? 'contatos.xlsx';

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Erro ao exportar arquivo');
    } finally {
      setExporting(false);
    }
  }

  const previewTruncated = total > clients.length;

  return (
    <AppShell title="Exportar clientes">
      <div className="export-page">
        <p className="export-page-intro">
          Filtre os clientes, confira a pré-visualização em tabela e exporte um
          arquivo Excel no formato do modelo de contatos.
        </p>

        <div className="export-toolbar card">
          <div className="export-toolbar-row">
            <label className="clients-search export-search">
              <span className="sr-only">Buscar cliente</span>
              <input
                type="search"
                placeholder="Nome, telefone, CPF/CNPJ, DDD, cidade/UF..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>

            <div className="export-toolbar-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => setFiltersOpen((open) => !open)}
              >
                {filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => void handleExport()}
                disabled={exporting || loading || total === 0}
              >
                {exporting ? 'Exportando…' : 'Exportar Excel'}
              </button>
            </div>
          </div>

          {filtersOpen && (
            <div className="export-filters-panel">
              <ClientTagFilters
                values={tagFilters}
                intentions={intentions}
                onChange={setTagFilters}
              />

              <div className="export-location-filters">
                <label className="hygiene-location-filter">
                  <span>Estado</span>
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                  >
                    <option value="">Todos</option>
                    {BRAZIL_STATES.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="hygiene-location-filter">
                  <span>DDD</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    placeholder="Ex.: 65"
                    value={dddFilter}
                    onChange={(e) =>
                      setDddFilter(e.target.value.replace(/\D/g, '').slice(0, 2))
                    }
                  />
                </label>

                {(stateFilter || dddFilter) && (
                  <button
                    type="button"
                    className="ghost hygiene-clear-location"
                    onClick={() => {
                      setStateFilter('');
                      setDddFilter('');
                    }}
                  >
                    Limpar localização
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <ClientListSummary
          total={total}
          clients={clients}
          page={1}
          limit={PREVIEW_LIMIT}
          totalPages={1}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={clearFilters}
        />

        {error && <p className="export-error">{error}</p>}

        {previewTruncated && !loading && (
          <p className="export-preview-note">
            Mostrando os primeiros {clients.length} de {total} clientes na
            pré-visualização. O arquivo exportado incluirá todos os{' '}
            {total} registros filtrados.
          </p>
        )}

        <div className="card export-preview-card">
          <ClientExportPreviewTable clients={clients} loading={loading} />
        </div>
      </div>
    </AppShell>
  );
}
