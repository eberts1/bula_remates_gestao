'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { BRAZIL_STATES } from '@/components/clients/CityUfField';
import { ClientExportDialog } from '@/components/clients/ClientExportDialog';
import { ClientExportHistory } from '@/components/clients/ClientExportHistory';
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
import type { ClientExportRequest } from '@/types/client-export';
import {
  exportClientsWithPurpose,
  filtersFromSearchParams,
} from '@/lib/client-export';
import { appendMapAreaToParams, type MapAreaSelection } from '@/types/map-area';

const ClientsMapPanel = dynamic(
  () =>
    import('@/components/clients/ClientsMapPanel').then(
      (m) => m.ClientsMapPanel,
    ),
  { ssr: false, loading: () => <div className="clients-map-skeleton" /> },
);

const PREVIEW_LIMIT = 500;

function buildFilterParams(
  tagFilters: TagFilterValues,
  stateFilter: string,
  dddFilter: string,
  search: string,
  mapArea: MapAreaSelection | null,
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
  if (tagFilters.nearCity && tagFilters.nearState && tagFilters.radiusKm) {
    params.set('nearCity', tagFilters.nearCity);
    params.set('nearState', tagFilters.nearState);
    params.set('radiusKm', tagFilters.radiusKm);
  }
  appendMapAreaToParams(params, mapArea);

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
  const [mapOpen, setMapOpen] = useState(false);
  const [mapArea, setMapArea] = useState<MapAreaSelection | null>(null);
  const [mapSelectedCount, setMapSelectedCount] = useState(0);

  const [intentions, setIntentions] = useState<TenantIntention[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
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
      buildFilterParams(
        tagFilters,
        stateFilter,
        debouncedDdd,
        debouncedSearch,
        mapArea,
      ),
    [tagFilters, stateFilter, debouncedDdd, debouncedSearch, mapArea],
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
    Boolean(mapArea) ||
    countActiveFilters(tagFilters) > 0;

  function clearFilters() {
    setSearch('');
    setTagFilters(emptyTagFilters());
    setStateFilter('');
    setDddFilter('');
    setMapArea(null);
  }

  async function handleExportConfirm(purposePayload: ClientExportRequest) {
    setError('');

    const result = await exportClientsWithPurpose({
      ...purposePayload,
      filters: filtersFromSearchParams(filterParams),
    });

    if (!result.ok) {
      setError(result.error);
      throw new Error(result.error);
    }

    setHistoryRefreshKey((value) => value + 1);
  }

  const previewTruncated = total > clients.length;

  return (
    <AppShell title="Exportar clientes">
      <div className="export-page">
        <p className="export-page-intro">
          Filtre os clientes por etiquetas, localização ou área no mapa. Antes de
          baixar o Excel, registre a finalidade da exportação para rastrear para
          onde foram os dados.
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
                onClick={() => setExportDialogOpen(true)}
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

        <div className="export-map-section card">
          <div className="export-map-header">
            <div>
              <h2 className="export-map-title">Mapa e seleção por região</h2>
              <p className="export-map-subtitle">
                Desenhe um retângulo ou círculo para filtrar e exportar apenas
                os clientes daquela área.
              </p>
            </div>
            <div className="export-map-header-actions">
              {mapArea && (
                <span className="clients-map-legend-selected">
                  {mapSelectedCount} na região
                </span>
              )}
              <button
                type="button"
                className="ghost"
                onClick={() => setMapOpen((open) => !open)}
              >
                {mapOpen ? 'Ocultar mapa' : 'Mostrar mapa'}
              </button>
              {mapArea && (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setMapArea(null)}
                >
                  Limpar área
                </button>
              )}
            </div>
          </div>

          {mapOpen && (
            <ClientsMapPanel
              selectedArea={mapArea}
              onAreaChange={setMapArea}
              onSelectedCountChange={setMapSelectedCount}
              showLegend={false}
            />
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

        <ClientExportHistory refreshKey={historyRefreshKey} />
      </div>

      <ClientExportDialog
        open={exportDialogOpen}
        clientCount={total}
        onClose={() => {
          if (!exporting) setExportDialogOpen(false);
        }}
        onConfirm={async (payload) => {
          setExporting(true);
          try {
            await handleExportConfirm(payload);
          } finally {
            setExporting(false);
          }
        }}
      />
    </AppShell>
  );
}
