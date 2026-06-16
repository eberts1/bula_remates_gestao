'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ANIMAL_SEX_LABELS,
  ANIMAL_TYPE_LABELS,
  CATEGORY_LABELS,
} from '@/components/clients/ClientTagsSection';
import type { AuctionMatchClient } from '@/types/auction';

interface Props {
  suggested: AuctionMatchClient[];
  included: AuctionMatchClient[];
  manual: AuctionMatchClient[];
  counts: {
    suggested: number;
    included: number;
    excluded: number;
    manual: number;
  };
  loading?: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onInclude: (input: { clientId: string; notes?: string }) => void;
  onExclude: (clientId: string) => void;
  onClear: (clientId: string) => void;
  mutationLoading?: boolean;
}

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
    parts.push(client.intentions.map((i) => i.label).join(', '));
  }
  return <span>{parts.join(' · ') || 'Sem categoria definida'}</span>;
}

function MatchClientRow({
  client,
  actions,
}: {
  client: AuctionMatchClient;
  actions: React.ReactNode;
}) {
  return (
    <div className="auction-match-row">
      <div className="auction-match-row-main">
        <Link href={`/clients/${client.id}`} className="auction-match-name">
          {client.name}
        </Link>
        <p className="auction-match-contact">
          {[client.phone, client.email].filter(Boolean).join(' · ') || 'Sem contato'}
        </p>
        <p className="auction-match-tags">
          <ClientTags client={client} />
        </p>
        {client.matchNotes && (
          <p className="auction-match-notes">Obs: {client.matchNotes}</p>
        )}
      </div>
      <div className="auction-match-row-actions">{actions}</div>
    </div>
  );
}

export function AuctionMatchPanel({
  suggested,
  included,
  manual,
  counts,
  loading = false,
  search,
  onSearchChange,
  onInclude,
  onExclude,
  onClear,
  mutationLoading = false,
}: Props) {
  const [manualNotes, setManualNotes] = useState<Record<string, string>>({});

  return (
    <div className="auction-match-panel">
      <div className="auction-match-toolbar card">
        <label className="auction-match-search">
          Buscar na sua carteira
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Nome, telefone, e-mail..."
          />
        </label>
        <div className="auction-match-counts">
          <span>{counts.included} incluidos</span>
          <span>{counts.suggested} compativeis</span>
          <span>{counts.excluded} excluidos</span>
        </div>
        <p className="auction-match-hint">
          Apenas clientes da sua carteira aparecem neste leilao.
        </p>
      </div>

      <section className="auction-match-section card">
        <header>
          <h3>Clientes incluidos</h3>
          <p>Seus clientes confirmados para este leilao.</p>
        </header>

        {loading && included.length === 0 ? (
          <p>Carregando matches…</p>
        ) : included.length === 0 ? (
          <p className="auction-match-empty">
            Nenhum cliente incluido ainda. Confirme sugestoes ou busque na sua
            carteira.
          </p>
        ) : (
          <div className="auction-match-list">
            {included.map((client) => (
              <MatchClientRow
                key={client.id}
                client={client}
                actions={
                  <>
                    <button
                      type="button"
                      className="ghost"
                      disabled={mutationLoading}
                      onClick={() => onExclude(client.id)}
                    >
                      Remover
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      disabled={mutationLoading}
                      onClick={() => onClear(client.id)}
                    >
                      Limpar decisao
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="auction-match-section card">
        <header>
          <h3>Compativeis automaticamente</h3>
          <p>Clientes da sua carteira com tags compativeis.</p>
        </header>

        {loading && suggested.length === 0 ? (
          <p>Carregando sugestoes…</p>
        ) : suggested.length === 0 ? (
          <p className="auction-match-empty">
            Nenhuma sugestao encontrada. Busque manualmente abaixo.
          </p>
        ) : (
          <div className="auction-match-list">
            {suggested.map((client) => (
              <MatchClientRow
                key={client.id}
                client={client}
                actions={
                  <>
                    <button
                      type="button"
                      disabled={mutationLoading}
                      onClick={() => onInclude({ clientId: client.id })}
                    >
                      Incluir
                    </button>
                    <button
                      type="button"
                      className="ghost"
                      disabled={mutationLoading}
                      onClick={() => onExclude(client.id)}
                    >
                      Excluir
                    </button>
                  </>
                }
              />
            ))}
          </div>
        )}
      </section>

      {search.trim().length >= 2 && (
        <section className="auction-match-section card">
          <header>
            <h3>Busca manual</h3>
            <p>
              Inclua qualquer cliente da sua carteira, mesmo sem categoria
              compativel.
            </p>
          </header>

          {loading && manual.length === 0 ? (
            <p>Buscando clientes…</p>
          ) : manual.length === 0 ? (
            <p className="auction-match-empty">
              Nenhum cliente encontrado na busca.
            </p>
          ) : (
            <div className="auction-match-list">
              {manual.map((client) => (
                <div key={client.id} className="auction-match-manual-row">
                  <MatchClientRow
                    client={client}
                    actions={
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
                          disabled={mutationLoading}
                          onClick={() =>
                            onInclude({
                              clientId: client.id,
                              notes: manualNotes[client.id]?.trim() || undefined,
                            })
                          }
                        >
                          Incluir
                        </button>
                      </div>
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
