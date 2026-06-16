'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

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
import { useClientDetail } from '@/hooks/use-client-detail';
import { useClientsList } from '@/hooks/use-clients-list';
import { useTenantIntentions } from '@/hooks/use-tenant-intentions';
import { queryKeys } from '@/lib/query/query-keys';
import type { ClientListItem } from '@/types/client';

const PAGE_LIMIT = 50;

function ClientsPageContent() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [tagFilters, setTagFilters] = useState<TagFilterValues>({
    animalType: searchParams.get('animalType') ?? '',
    animalSex: searchParams.get('animalSex') ?? '',
    livestockCategory: searchParams.get('livestockCategory') ?? '',
    intentionId: searchParams.get('intentionId') ?? '',
    nearCity: searchParams.get('nearCity') ?? '',
    nearState: searchParams.get('nearState') ?? '',
    radiusKm: searchParams.get('radiusKm') ?? '',
  });
  const [filtersOpen, setFiltersOpen] = useState(
    Boolean(
      searchParams.get('animalType') ||
        searchParams.get('animalSex') ||
        searchParams.get('livestockCategory') ||
        searchParams.get('intentionId') ||
        searchParams.get('nearCity'),
    ),
  );

  const [page, setPage] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editClientId, setEditClientId] = useState<string | null>(null);

  const { data: intentions = [] } = useTenantIntentions();

  const listFilters = useMemo(
    () => ({
      page,
      limit: PAGE_LIMIT,
      q: debouncedSearch || undefined,
      animalType: tagFilters.animalType || undefined,
      animalSex: tagFilters.animalSex || undefined,
      livestockCategory: tagFilters.livestockCategory || undefined,
      intentionId: tagFilters.intentionId || undefined,
      nearCity:
        tagFilters.nearCity && tagFilters.nearState && tagFilters.radiusKm
          ? tagFilters.nearCity
          : undefined,
      nearState:
        tagFilters.nearCity && tagFilters.nearState && tagFilters.radiusKm
          ? tagFilters.nearState
          : undefined,
      radiusKm:
        tagFilters.nearCity && tagFilters.nearState && tagFilters.radiusKm
          ? tagFilters.radiusKm
          : undefined,
    }),
    [page, debouncedSearch, tagFilters],
  );

  const { data: clientsData, isLoading, isFetching } = useClientsList(listFilters);
  const { data: editClient, isLoading: drawerLoading } = useClientDetail(
    editClientId,
    drawerOpen && Boolean(editClientId),
  );

  const clients = clientsData?.items ?? [];
  const total = clientsData?.total ?? 0;
  const totalPages = clientsData?.totalPages ?? 1;
  const loading = isLoading || (isFetching && clients.length === 0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, tagFilters]);

  function handleSaved() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    setEditClientId(null);
  }

  function openNewClient() {
    setEditClientId(null);
    setDrawerOpen(true);
  }

  function openEditClient(item: ClientListItem) {
    setEditClientId(item.id);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditClientId(null);
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
        client={editClientId ? (editClient ?? null) : null}
        loading={drawerLoading}
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
