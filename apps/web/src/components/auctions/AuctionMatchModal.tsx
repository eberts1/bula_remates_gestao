'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ANIMAL_SEX_LABELS,
  ANIMAL_TYPE_LABELS,
  CATEGORY_LABELS,
} from '@/components/clients/ClientTagsSection';
import { useCreateAuctionAttendance } from '@/hooks/use-auction-schedule';
import {
  useAuctionMatchMutations,
  useAuctionMatches,
} from '@/hooks/use-auction-matches';
import type { AuctionListItem, AuctionMatchClient } from '@/types/auction';

interface Props {
  open: boolean;
  auction: AuctionListItem | null;
  onClose: () => void;
}

type TabKey = 'suggested' | 'search' | 'included';

function ClientTags({ client }: { client: AuctionMatchClient }) {
  const parts: string[] = [];
  if (client.animalType) {
    parts.push(ANIMAL_TYPE_LABELS[client.animalType] ?? client.animalType);
  }
  if (client.animalSex) {
    parts.push(ANIMAL_SEX_LABELS[client.animalSex] ?? client.animalSex);
  }
  if (client.livestockCategory) {
    parts.push(
      CATEGORY_LABELS[client.livestockCategory] ?? client.livestockCategory,
    );
  }
  if (client.intentions.length > 0) {
    parts.push(client.intentions.map((item) => item.label).join(', '));
  }
  return <span>{parts.join(' · ') || 'Sem categoria definida'}</span>;
}

function ClientRow({
  client,
  checked,
  onToggle,
  trailing,
}: {
  client: AuctionMatchClient;
  checked: boolean;
  onToggle: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="auction-match-modal-row">
      <label className="auction-match-modal-row-check">
        <input type="checkbox" checked={checked} onChange={onToggle} />
      </label>
      <div className="auction-match-modal-row-main">
        <Link href={`/clients/${client.id}`} className="auction-match-name">
          {client.name}
        </Link>
        <p className="auction-match-contact">
          {[client.phone, client.email].filter(Boolean).join(' · ') ||
            'Sem contato'}
        </p>
        <p className="auction-match-tags">
          <ClientTags client={client} />
        </p>
        {client.matchNotes && (
          <p className="auction-match-notes">{client.matchNotes}</p>
        )}
      </div>
      {trailing}
    </div>
  );
}

export function AuctionMatchModal({ open, auction, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('suggested');
  const [manualNotes, setManualNotes] = useState<Record<string, string>>({});
  const [addingClientId, setAddingClientId] = useState<string | null>(null);

  const auctionId = auction?.id ?? '';
  const { data: matches, isLoading } = useAuctionMatches(
    auctionId,
    debouncedSearch,
    open && Boolean(auctionId),
  );
  const { includeClient } = useAuctionMatchMutations(auctionId, debouncedSearch);
  const createAttendance = useCreateAuctionAttendance(auctionId);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!open) {
      setSearch('');
      setDebouncedSearch('');
      setSelectedIds([]);
      setFeedback(null);
      setActiveTab('suggested');
      setManualNotes({});
      setAddingClientId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !auction) return null;

  const suggested = matches?.suggested ?? [];
  const included = matches?.included ?? [];
  const manual = matches?.manual ?? [];
  const counts = matches?.counts ?? {
    suggested: 0,
    included: 0,
    excluded: 0,
    manual: 0,
  };

  function toggleClient(clientId: string) {
    setSelectedIds((current) =>
      current.includes(clientId)
        ? current.filter((id) => id !== clientId)
        : [...current, clientId],
    );
  }

  function selectAllFromList(clients: AuctionMatchClient[]) {
    setSelectedIds(clients.map((client) => client.id));
  }

  async function handleCreateAttendance() {
    if (!selectedIds.length) return;

    setFeedback(null);
    try {
      const result = await createAttendance.mutateAsync(selectedIds);
      setFeedback(
        `${result.createdCount} atividade(s) criada(s) no atendimento` +
          (result.skippedCount
            ? ` · ${result.skippedCount} ja existente(s)`
            : ''),
      );
      setSelectedIds([]);
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : 'Erro ao criar atividades',
      );
    }
  }

  async function handleIncludeManual(client: AuctionMatchClient) {
    setAddingClientId(client.id);
    setFeedback(null);
    try {
      await includeClient.mutateAsync({
        clientId: client.id,
        notes: manualNotes[client.id]?.trim() || undefined,
      });
      setFeedback(`${client.name} incluido no leilao`);
      setManualNotes((current) => {
        const next = { ...current };
        delete next[client.id];
        return next;
      });
    } catch (error) {
      setFeedback(
        error instanceof Error ? error.message : 'Erro ao incluir cliente',
      );
    } finally {
      setAddingClientId(null);
    }
  }

  const listClients =
    activeTab === 'suggested'
      ? suggested
      : activeTab === 'included'
        ? included
        : manual;

  return (
    <div className="auction-match-modal-root" role="presentation">
      <div
        className="auction-match-modal-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={`auction-match-modal card${auction.isBulaRemates ? ' auction-match-modal--bula' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`Clientes do leilao — ${auction.name}`}
      >
        <header className="auction-match-modal-header">
          <div>
            <h2>Meus clientes no leilao</h2>
            <p>
              {auction.name}
              {auction.isBulaRemates && (
                <span className="auction-bula-badge">Bula Remates</span>
              )}
            </p>
            <small>
              A agenda e compartilhada. Apenas seus clientes aparecem aqui.
            </small>
          </div>
          <button type="button" className="ghost" onClick={onClose}>
            Fechar
          </button>
        </header>

        <div className="auction-match-modal-tabs">
          <button
            type="button"
            className={activeTab === 'suggested' ? 'is-active' : undefined}
            onClick={() => setActiveTab('suggested')}
          >
            Compativeis ({counts.suggested})
          </button>
          <button
            type="button"
            className={activeTab === 'search' ? 'is-active' : undefined}
            onClick={() => setActiveTab('search')}
          >
            Buscar cliente
          </button>
          <button
            type="button"
            className={activeTab === 'included' ? 'is-active' : undefined}
            onClick={() => setActiveTab('included')}
          >
            Incluidos ({counts.included})
          </button>
        </div>

        <div className="auction-match-modal-toolbar">
          <label className="auction-match-search">
            {activeTab === 'search' ? 'Buscar na sua carteira' : 'Filtrar lista'}
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, telefone, e-mail..."
            />
          </label>
        </div>

        {isLoading ? (
          <p>Carregando clientes…</p>
        ) : activeTab === 'search' && debouncedSearch.trim().length < 2 ? (
          <p className="auction-match-empty">
            Digite ao menos 2 caracteres para buscar qualquer cliente da sua
            carteira, mesmo sem categoria compativel.
          </p>
        ) : listClients.length === 0 ? (
          <p className="auction-match-empty">
            {activeTab === 'suggested'
              ? 'Nenhum cliente compativel na sua carteira. Use a aba Buscar cliente.'
              : activeTab === 'included'
                ? 'Nenhum cliente incluido ainda.'
                : 'Nenhum cliente encontrado na busca.'}
          </p>
        ) : (
          <div className="auction-match-modal-list">
            {listClients.map((client) =>
              activeTab === 'search' ? (
                <div key={client.id} className="auction-match-manual-row">
                  <ClientRow
                    client={client}
                    checked={false}
                    onToggle={() => undefined}
                  />
                  <div className="auction-match-manual-actions">
                    <textarea
                      rows={2}
                      placeholder="Observacao (opcional)"
                      value={manualNotes[client.id] ?? ''}
                      onChange={(event) =>
                        setManualNotes((current) => ({
                          ...current,
                          [client.id]: event.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      disabled={
                        addingClientId === client.id || includeClient.isPending
                      }
                      onClick={() => void handleIncludeManual(client)}
                    >
                      {addingClientId === client.id ? 'Incluindo…' : 'Incluir'}
                    </button>
                  </div>
                </div>
              ) : (
                <ClientRow
                  key={client.id}
                  client={client}
                  checked={selectedIds.includes(client.id)}
                  onToggle={() => toggleClient(client.id)}
                />
              ),
            )}
          </div>
        )}

        {feedback && (
          <p className="auction-match-feedback">
            {feedback}{' '}
            {feedback.includes('atividade') && (
              <Link href="/attendance">Ver atendimento</Link>
            )}
          </p>
        )}

        <footer className="auction-match-modal-footer">
          {activeTab !== 'search' && listClients.length > 0 && (
            <button
              type="button"
              className="ghost"
              onClick={() => selectAllFromList(listClients)}
            >
              Selecionar todos
            </button>
          )}
          <div className="auction-match-modal-footer-actions">
            <Link href={`/auctions/${auction.id}`} className="auction-card-link">
              Ver detalhes
            </Link>
            <button
              type="button"
              disabled={!selectedIds.length || createAttendance.isPending}
              onClick={() => void handleCreateAttendance()}
            >
              {createAttendance.isPending
                ? 'Criando…'
                : `Criar atividade (${selectedIds.length})`}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
