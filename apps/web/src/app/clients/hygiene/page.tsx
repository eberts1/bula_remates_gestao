'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { ClientPagination } from '@/components/clients/ClientPagination';
import { DuplicateGroupCard } from '@/components/clients/DuplicateGroupCard';
import { HygieneQueueTable } from '@/components/clients/HygieneQueueTable';
import { HygieneReviewDrawer } from '@/components/clients/HygieneReviewDrawer';
import { MergeClientsDrawer } from '@/components/clients/MergeClientsDrawer';
import { ClientTagsSection } from '@/components/clients/ClientTagsSection';
import { BRAZIL_STATES } from '@/components/clients/CityUfField';
import { useTenantIntentions } from '@/hooks/use-tenant-intentions';
import type {
  DuplicateGroup,
  HygieneClient,
  HygieneFilter,
  HygieneIssue,
  HygieneSummary,
} from '@/types/client-hygiene';
import { ISSUE_LABELS } from '@/types/client-hygiene';

const PAGE_LIMIT = 50;

const FILTERS: { id: HygieneFilter; label: string }[] = [
  { id: 'any', label: 'Todos' },
  { id: 'location', label: ISSUE_LABELS.location },
  { id: 'tags', label: ISSUE_LABELS.tags },
  { id: 'incomplete', label: ISSUE_LABELS.incomplete },
  { id: 'duplicates', label: 'Duplicados' },
];

const emptyBatchTags = () => ({
  animalType: '',
  animalSex: '',
  livestockCategory: '',
  intentionIds: [] as string[],
});

export default function ClientHygienePage() {
  const [filter, setFilter] = useState<HygieneFilter>('any');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [dddFilter, setDddFilter] = useState('');
  const [debouncedDdd, setDebouncedDdd] = useState('');
  const [page, setPage] = useState(1);

  const [clients, setClients] = useState<HygieneClient[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [summary, setSummary] = useState<HygieneSummary | null>(null);
  const { data: intentions = [] } = useTenantIntentions();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchTags, setBatchTags] = useState(emptyBatchTags);
  const [applyingBatch, setApplyingBatch] = useState(false);

  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [dupTotalGroups, setDupTotalGroups] = useState(0);

  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [reviewDirty, setReviewDirty] = useState(false);
  const [mergeGroup, setMergeGroup] = useState<DuplicateGroup | null>(null);
  const [mergeSelectedIds, setMergeSelectedIds] = useState<string[] | null>(
    null,
  );

  function openMerge(group: DuplicateGroup, selectedIds?: string[]) {
    setMergeGroup(group);
    setMergeSelectedIds(selectedIds ?? null);
  }

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedDdd(dddFilter.replace(/\D/g, '')), 300);
    return () => clearTimeout(t);
  }, [dddFilter]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter, stateFilter, debouncedDdd]);

  const loadSummary = useCallback(() => {
    fetch('/api/client-hygiene/summary')
      .then((r) => r.json())
      .then((data) => setSummary(data as HygieneSummary))
      .catch(() => {});
  }, []);

  const loadDuplicates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('q', debouncedSearch);

      const res = await fetch(`/api/client-hygiene/duplicates?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao carregar');
      setDuplicateGroups(data.groups ?? []);
      setDupTotalGroups(data.totalGroups ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  const load = useCallback(async () => {
    if (filter === 'duplicates') {
      await loadDuplicates();
      return;
    }

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        issue: filter,
        page: String(page),
        limit: String(PAGE_LIMIT),
      });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (stateFilter) params.set('state', stateFilter);
      if (debouncedDdd.length === 2) params.set('ddd', debouncedDdd);

      const res = await fetch(`/api/client-hygiene?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao carregar');
      setClients(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
      setSelectedIds(new Set());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [filter, page, debouncedSearch, stateFilter, debouncedDdd, loadDuplicates]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((prev) =>
      prev.size === clients.length
        ? new Set()
        : new Set(clients.map((c) => c.id)),
    );
  }

  async function applyBatchTags() {
    if (selectedIds.size === 0) return;
    setApplyingBatch(true);
    setError('');
    try {
      const res = await fetch('/api/client-hygiene/bulk-tags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIds: [...selectedIds],
          ...(batchTags.animalType ? { animalType: batchTags.animalType } : {}),
          ...(batchTags.animalSex ? { animalSex: batchTags.animalSex } : {}),
          ...(batchTags.livestockCategory
            ? { livestockCategory: batchTags.livestockCategory }
            : {}),
          ...(batchTags.intentionIds.length
            ? { intentionIds: batchTags.intentionIds }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao aplicar etiquetas');
      setBatchTags(emptyBatchTags());
      await load();
      loadSummary();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao aplicar etiquetas');
    } finally {
      setApplyingBatch(false);
    }
  }

  const reviewClient = reviewIndex !== null ? clients[reviewIndex] ?? null : null;

  function closeReview() {
    setReviewIndex(null);
    setReviewDirty(false);
    void load();
    loadSummary();
  }

  function openReview(client: HygieneClient) {
    const index = clients.findIndex((c) => c.id === client.id);
    if (index < 0) return;
    if (
      reviewIndex !== null &&
      reviewDirty &&
      index !== reviewIndex &&
      !window.confirm(
        'Há alterações não salvas. Deseja sair sem salvar as mudanças?',
      )
    ) {
      return;
    }
    setReviewIndex(index);
  }

  function reviewNext() {
    if (reviewIndex === null) return;
    if (reviewIndex + 1 < clients.length) {
      setReviewIndex(reviewIndex + 1);
    } else {
      closeReview();
    }
  }

  const hasBatchTags = useMemo(
    () =>
      Boolean(
        batchTags.animalType ||
          batchTags.animalSex ||
          batchTags.livestockCategory ||
          batchTags.intentionIds.length,
      ),
    [batchTags],
  );

  return (
    <AppShell title="Higienização de clientes">
      <p
        style={{
          color: 'var(--muted)',
          marginBottom: '1rem',
          fontSize: '0.9rem',
        }}
      >
        Revise clientes com localização inválida, sem etiquetas, cadastro
        incompleto ou duplicados para unificar.{' '}
        <Link href="/clients">Voltar para clientes</Link>
      </p>

      <div className="hygiene-filters">
        {FILTERS.map((f) => {
          const count =
            summary && f.id === 'duplicates'
              ? summary.duplicateGroups
              : summary && f.id !== 'any' && f.id !== 'duplicates'
                ? summary[f.id as HygieneIssue]
                : summary
                  ? summary.any
                  : undefined;
          return (
            <button
              key={f.id}
              type="button"
              className={`hygiene-filter-chip${filter === f.id ? ' active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {count !== undefined && (
                <span className="hygiene-filter-count">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="hygiene-toolbar">
        <label className="clients-search hygiene-toolbar-search">
          <span className="sr-only">Buscar cliente</span>
          <input
            type="search"
            placeholder="Nome, documento ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

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

      {error && (
        <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>
      )}

      {filter !== 'duplicates' && (
        <div className="card hygiene-batch-card">
          <h3 className="form-section-title">Etiquetar selecionados</h3>
          <ClientTagsSection
            value={batchTags}
            intentions={intentions}
            onChange={setBatchTags}
          />
          <button
            type="button"
            className="ghost"
            style={{ marginTop: '0.75rem' }}
            disabled={selectedIds.size === 0 || !hasBatchTags || applyingBatch}
            onClick={() => void applyBatchTags()}
          >
            {applyingBatch
              ? 'Aplicando…'
              : `Aplicar etiquetas a ${selectedIds.size} cliente(s)`}
          </button>
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Carregando…</p>
      ) : filter === 'duplicates' ? (
        duplicateGroups.length === 0 ? (
          <p style={{ color: 'var(--muted)' }}>
            Nenhum grupo de cadastros duplicados encontrado.
          </p>
        ) : (
          <>
            <p
              style={{
                color: 'var(--muted)',
                fontSize: '0.875rem',
                margin: '1rem 0 0.5rem',
              }}
            >
              {dupTotalGroups} grupo(s) de possíveis duplicados
            </p>
            <div className="hygiene-dup-list">
              {duplicateGroups.map((group) => (
                <DuplicateGroupCard
                  key={group.id}
                  group={group}
                  onMerge={openMerge}
                />
              ))}
            </div>
          </>
        )
      ) : clients.length === 0 ? (
        <p style={{ color: 'var(--muted)' }}>
          Nenhum cliente com pendências neste filtro.
        </p>
      ) : (
        <>
          <p
            style={{
              color: 'var(--muted)',
              fontSize: '0.875rem',
              margin: '1rem 0 0.5rem',
            }}
          >
            {total} cliente(s) com pendências
          </p>
          <HygieneQueueTable
            clients={clients}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={toggleAll}
            onReview={openReview}
          />
          <ClientPagination
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}

      <HygieneReviewDrawer
        key={reviewClient?.id}
        client={reviewClient}
        intentions={intentions}
        onClose={closeReview}
        onSaved={closeReview}
        onSaveAndNext={reviewNext}
        onDirtyChange={setReviewDirty}
        hasNext={
          reviewIndex !== null && reviewIndex + 1 < clients.length
        }
      />

      <MergeClientsDrawer
        group={mergeGroup}
        initialSelectedIds={mergeSelectedIds}
        intentions={intentions}
        onClose={() => {
          setMergeGroup(null);
          setMergeSelectedIds(null);
        }}
        onMerged={() => {
          setMergeGroup(null);
          setMergeSelectedIds(null);
          void load();
          loadSummary();
        }}
      />
    </AppShell>
  );
}
