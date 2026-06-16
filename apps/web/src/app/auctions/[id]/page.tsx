'use client';

import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { AuctionFormDrawer } from '@/components/auctions/AuctionFormDrawer';
import { AuctionMatchPanel } from '@/components/auctions/AuctionMatchPanel';
import {
  ANIMAL_SEX_LABELS,
  ANIMAL_TYPE_LABELS,
  CATEGORY_LABELS,
} from '@/components/clients/ClientTagsSection';
import { AUCTION_STATUS_LABELS } from '@docs/shared';
import { useAuctionDetail } from '@/hooks/use-auction-detail';
import {
  useAuctionMatchMutations,
  useAuctionMatches,
} from '@/hooks/use-auction-matches';

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(value: string | null) {
  if (!value) return 'Data não definida';
  return new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

export default function AuctionDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: auction, isLoading, error, refetch } = useAuctionDetail(id);
  const { data: matches, isLoading: matchesLoading, isFetching } =
    useAuctionMatches(id, debouncedSearch);
  const { includeClient, excludeClient, clearDecision } =
    useAuctionMatchMutations(id, debouncedSearch);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const mutationLoading =
    includeClient.isPending ||
    excludeClient.isPending ||
    clearDecision.isPending;

  function formatTags() {
    if (!auction) return '';
    const parts: string[] = [];
    if (auction.animalType) {
      parts.push(ANIMAL_TYPE_LABELS[auction.animalType] ?? auction.animalType);
    }
    if (auction.animalSex) {
      parts.push(ANIMAL_SEX_LABELS[auction.animalSex] ?? auction.animalSex);
    }
    if (auction.livestockCategories.length > 0) {
      parts.push(
        auction.livestockCategories
          .map((c) => CATEGORY_LABELS[c] ?? c)
          .join(', '),
      );
    }
    if (auction.targetIntentionCode) {
      parts.push(`Intenção: ${auction.targetIntentionCode}`);
    }
    return parts.join(' · ');
  }

  return (
    <AppShell title="Leilão">
      <div className="auction-detail-header">
        <Link href="/auctions" className="auction-back-link">
          ← Voltar para leilões
        </Link>
        {auction && (
          <button type="button" className="ghost" onClick={() => setDrawerOpen(true)}>
            Editar leilão
          </button>
        )}
      </div>

      {error && (
        <p className="error-banner">
          {error instanceof Error ? error.message : 'Erro ao carregar leilão'}
        </p>
      )}

      {isLoading && !auction ? (
        <p>Carregando leilão…</p>
      ) : auction ? (
        <>
          <section className="card auction-detail-summary">
            <div className="auction-detail-title-row">
              <div>
                <h2>
                  {auction.name}
                  {auction.isBulaRemates && (
                    <span className="auction-bula-badge">Bula Remates</span>
                  )}
                </h2>
                <p>{formatDate(auction.scheduledAt)}</p>
              </div>
              <span className={`auction-status auction-status--${auction.status}`}>
                {AUCTION_STATUS_LABELS[
                  auction.status as keyof typeof AUCTION_STATUS_LABELS
                ] ?? auction.status}
              </span>
            </div>

            {auction.location && <p>{auction.location}</p>}
            <p className="auction-detail-tags">{formatTags()}</p>
            {auction.offersNotes && (
              <div className="auction-detail-offers">
                <h3>Ofertas disponíveis</h3>
                <p>{auction.offersNotes}</p>
              </div>
            )}
          </section>

          <AuctionMatchPanel
            suggested={matches?.suggested ?? []}
            included={matches?.included ?? []}
            manual={matches?.manual ?? []}
            counts={
              matches?.counts ?? {
                suggested: 0,
                included: 0,
                excluded: 0,
                manual: 0,
              }
            }
            loading={matchesLoading}
            search={search}
            onSearchChange={setSearch}
            onInclude={(input) => includeClient.mutate(input)}
            onExclude={(clientId) => excludeClient.mutate(clientId)}
            onClear={(clientId) => clearDecision.mutate(clientId)}
            mutationLoading={mutationLoading || isFetching}
          />
        </>
      ) : null}

      <AuctionFormDrawer
        open={drawerOpen}
        auction={auction ?? null}
        onClose={() => setDrawerOpen(false)}
        onSaved={() => {
          void refetch();
          setDrawerOpen(false);
        }}
      />
    </AppShell>
  );
}
