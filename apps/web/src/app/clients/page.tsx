'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { ClientFormDrawer } from '@/components/clients/ClientFormDrawer';
import { ClientGallery } from '@/components/clients/ClientGallery';
import { ClientListSummary } from '@/components/clients/ClientListSummary';
import { ClientPagination } from '@/components/clients/ClientPagination';
import { ClientToolbar } from '@/components/clients/ClientToolbar';
import {
  emptyTagFilters,
  type TagFilterValues,
} from '@/components/clients/ClientTagFilters';

import type { Client } from '@/types/client';
import type { TenantIntention } from '@/types/client-import';

const PAGE_LIMIT = 50;

function ClientsPageContent() {
  const searchParams = useSearchParams();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tagFilters, setTagFilters] = useState<TagFilterValues>({
    animalType: searchParams.get('animalType') ?? '',
    animalSex: searchParams.get('animalSex') ?? '',
    livestockCategory: searchParams.get('livestockCategory') ?? '',
    intentionId: searchParams.get('intentionId') ?? '',
  });
  const [filtersOpen, setFiltersOpen] = useState(
    Boolean(
      searchParams.get('animalType') ||
        searchParams.get('animalSex') ||
        searchParams.get('livestockCategory') ||
        searchParams.get('intentionId'),
    ),
  );

  const [intentions, setIntentions] = useState<TenantIntention[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

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
  }, [debouncedSearch, tagFilters]);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        limit: String(PAGE_LIMIT),
        page: String(page),
      });

      if (debouncedSearch) params.set('q', debouncedSearch);
      if (tagFilters.animalType) params.set('animalType', tagFilters.animalType);
      if (tagFilters.animalSex) params.set('animalSex', tagFilters.animalSex);
      if (tagFilters.livestockCategory) {
        params.set('livestockCategory', tagFilters.livestockCategory);
      }
      if (tagFilters.intentionId) params.set('intentionId', tagFilters.intentionId);

      const res = await fetch(`/api/clients?${params}`);
      const data = await res.json();

      if (res.ok) {
        setClients(data.items ?? []);
        setTotal(data.total ?? 0);
        setTotalPages(data.totalPages ?? 1);
      }
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, tagFilters, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function handleSaved() {
    void load();
    setSelectedClient(null);
  }

  function openNewClient() {
    setSelectedClient(null);
    setDrawerOpen(true);
  }

  function openEditClient(client: Client) {
    setSelectedClient(client);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setSelectedClient(null);
  }

  function clearFilters() {
    setSearch('');
    setTagFilters(emptyTagFilters());
  }

  const hasActiveFilters =
    Boolean(debouncedSearch) ||
    Boolean(tagFilters.animalType) ||
    Boolean(tagFilters.animalSex) ||
    Boolean(tagFilters.livestockCategory) ||
    Boolean(tagFilters.intentionId);

  return (
    <AppShell title="Clientes">
      <ClientToolbar
        search={search}
        onSearchChange={setSearch}
        tagFilters={tagFilters}
        onTagFiltersChange={setTagFilters}
        intentions={intentions}
        filtersOpen={filtersOpen}
        onToggleFilters={() => setFiltersOpen((open) => !open)}
        onNewClient={openNewClient}
      />

      <ClientListSummary
        total={total}
        clients={clients}
        page={page}
        limit={PAGE_LIMIT}
        totalPages={totalPages}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      <ClientGallery
        clients={clients}
        loading={loading}
        onEdit={openEditClient}
        onNewClient={openNewClient}
      />

      <ClientPagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <ClientFormDrawer
        open={drawerOpen}
        client={selectedClient}
        onClose={closeDrawer}
        onSaved={handleSaved}
      />
    </AppShell>
  );
}

export default function ClientsPage() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem' }}>Carregando…</p>}>
      <ClientsPageContent />
    </Suspense>
  );
}
