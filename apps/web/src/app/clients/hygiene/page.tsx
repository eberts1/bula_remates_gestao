'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { ClientPagination } from '@/components/clients/ClientPagination';
import { HygieneQueueTable } from '@/components/clients/HygieneQueueTable';
import { HygieneReviewDrawer } from '@/components/clients/HygieneReviewDrawer';
import { ClientTagsSection } from '@/components/clients/ClientTagsSection';
import type { TenantIntention } from '@/types/client-import';
import type {
  HygieneClient,
  HygieneFilter,
  HygieneSummary,
} from '@/types/client-hygiene';
import { ISSUE_LABELS } from '@/types/client-hygiene';

const PAGE_LIMIT = 50;

const FILTERS: { id: HygieneFilter; label: string }[] = [
  { id: 'any', label: 'Todos' },
  { id: 'location', label: ISSUE_LABELS.location },
  { id: 'tags', label: ISSUE_LABELS.tags },
  { id: 'incomplete', label: ISSUE_LABELS.incomplete },
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
  const [page, setPage] = useState(1);

  const [clients, setClients] = useState<HygieneClient[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [summary, setSummary] = useState<HygieneSummary | null>(null);
  const [intentions, setIntentions] = useState<TenantIntention[]>([]);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchTags, setBatchTags] = useState(emptyBatchTags);
  const [applyingBatch, setApplyingBatch] = useState(false);

  const [reviewIndex, setReviewIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/tenant-intentions')
      .then((r) => r.json())
      .then((data) => setIntentions(data.items ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filter]);

  const loadSummary = useCallback(() => {
    fetch('/api/client-hygiene/summary')
      .then((r) => r.json())
      .then((data) => setSummary(data as HygieneSummary))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        issue: filter,
        page: String(page),
        limit: String(PAGE_LIMIT),
      });
      if (debouncedSearch) params.set('q', debouncedSearch);

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
  }, [filter, page, debouncedSearch]);

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
    void load();
    loadSummary();
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
        Revise clientes com localização inválida, sem etiquetas ou cadastro
        incompleto. <Link href="/clients">Voltar para clientes</Link>
      </p>

      <div className="hygiene-filters">
        {FILTERS.map((f) => {
          const count =
            summary && f.id !== 'any'
              ? summary[f.id]
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

      <label className="clients-search" style={{ marginBottom: '1rem' }}>
        <span className="sr-only">Buscar cliente</span>
        <input
          type="search"
          placeholder="Nome, documento ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>

      {error && (
        <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>
      )}

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

      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Carregando…</p>
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
            onReview={(client) =>
              setReviewIndex(clients.findIndex((c) => c.id === client.id))
            }
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
        hasNext={
          reviewIndex !== null && reviewIndex + 1 < clients.length
        }
      />
    </AppShell>
  );
}
