'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { AuctionCard } from '@/components/auctions/AuctionCard';
import { AuctionFilters } from '@/components/auctions/AuctionFilters';
import { AuctionFormDrawer } from '@/components/auctions/AuctionFormDrawer';
import { AuctionMatchModal } from '@/components/auctions/AuctionMatchModal';
import { AuctionSchedulePanel } from '@/components/auctions/AuctionSchedulePanel';
import { useAuctionDetail } from '@/hooks/use-auction-detail';
import { useAuctionsList } from '@/hooks/use-auctions-list';
import {
  emptyAuctionListFilters,
  filterAuctions,
  groupAuctionsByDate,
} from '@/lib/auction-list-utils';
import type { AuctionListItem } from '@/types/auction';

type TabKey = 'agenda' | 'planilha';

export default function AuctionsPage() {
  const { data, isLoading, error, refetch, isFetching } = useAuctionsList();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editAuctionId, setEditAuctionId] = useState<string | null>(null);
  const [matchAuction, setMatchAuction] = useState<AuctionListItem | null>(null);
  const [filters, setFilters] = useState(emptyAuctionListFilters());
  const [activeTab, setActiveTab] = useState<TabKey>('agenda');

  const { data: editAuction, isLoading: drawerLoading } = useAuctionDetail(
    editAuctionId,
    drawerOpen && Boolean(editAuctionId),
  );

  function openNew() {
    setEditAuctionId(null);
    setDrawerOpen(true);
  }

  function openEdit(id: string) {
    setEditAuctionId(id);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditAuctionId(null);
  }

  function handleSaved() {
    void refetch();
  }

  const items = data?.items ?? [];
  const filteredItems = useMemo(
    () => filterAuctions(items, filters),
    [items, filters],
  );
  const groupedItems = useMemo(
    () => groupAuctionsByDate(filteredItems),
    [filteredItems],
  );

  return (
    <AppShell title="Leiloes">
      <div className="auction-page-toolbar">
        <div>
          <h2>Agenda de leiloes</h2>
          <p>
            Agenda compartilhada entre todos os usuarios. Cada pessoa gerencia
            apenas os proprios clientes e atividades.
          </p>
        </div>
        <div className="auction-page-toolbar-actions">
          <Link href="/auctions/import" className="auction-import-link">
            Importar arquivo
          </Link>
          <button type="button" onClick={openNew}>
            Novo leilao
          </button>
        </div>
      </div>

      <div className="auction-tabs">
        <button
          type="button"
          className={activeTab === 'agenda' ? 'is-active' : undefined}
          onClick={() => setActiveTab('agenda')}
        >
          Agenda
        </button>
        <button
          type="button"
          className={activeTab === 'planilha' ? 'is-active' : undefined}
          onClick={() => setActiveTab('planilha')}
        >
          Previstos na planilha
        </button>
      </div>

      {error && (
        <p className="error-banner">
          {error instanceof Error ? error.message : 'Erro ao carregar leiloes'}
        </p>
      )}

      {activeTab === 'planilha' ? (
        <AuctionSchedulePanel onImported={() => void refetch()} />
      ) : (
        <>
          <AuctionFilters value={filters} onChange={setFilters} />

          {isLoading && !data ? (
            <p>Carregando leiloes…</p>
          ) : filteredItems.length === 0 ? (
            <div className="card auction-empty-state">
              <p>
                {items.length === 0
                  ? 'Nenhum leilao cadastrado ainda.'
                  : 'Nenhum leilao encontrado com os filtros atuais.'}
              </p>
              {items.length === 0 && (
                <button type="button" onClick={openNew}>
                  Criar primeiro leilao
                </button>
              )}
            </div>
          ) : (
            <div className="auction-agenda">
              {groupedItems.map((group) => (
                <section key={group.dateKey} className="auction-date-group">
                  <header className="auction-date-group-header">
                    <h3>{group.label}</h3>
                    <span>{group.auctions.length} leilao(oes)</span>
                  </header>
                  <div className="auction-grid">
                    {group.auctions.map((auction) => (
                      <AuctionCard
                        key={auction.id}
                        auction={auction}
                        onEdit={openEdit}
                        onMatch={setMatchAuction}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {isFetching && data && <p className="auction-refreshing">Atualizando…</p>}

      <AuctionFormDrawer
        open={drawerOpen}
        auction={editAuctionId ? (editAuction ?? null) : null}
        loading={drawerLoading}
        onClose={closeDrawer}
        onSaved={handleSaved}
      />

      <AuctionMatchModal
        open={Boolean(matchAuction)}
        auction={matchAuction}
        onClose={() => setMatchAuction(null)}
      />
    </AppShell>
  );
}
