'use client';

import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { fetchJson } from '@/lib/query/fetch-json';
import { queryKeys } from '@/lib/query/query-keys';
import type { Client, ClientListItem } from '@/types/client';

interface Props {
  clients: ClientListItem[];
  loading: boolean;
  onEdit: (client: ClientListItem) => void;
  onNewClient: () => void;
}

function ClientCard({
  item,
  expanded,
  details,
  detailsLoading,
  onToggleExpand,
  onEdit,
}: {
  item: ClientListItem;
  expanded: boolean;
  details: Client | null;
  detailsLoading: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
}) {
  const display = details ?? null;

  return (
    <article className={`client-card${expanded ? ' client-card--expanded' : ''}`}>
      <div className="client-card-header">
        <h3 className="client-card-name">{item.name}</h3>
        <div className="client-card-badges">
          {!item.isComplete && (
            <span className="badge badge-incomplete">Incompleto</span>
          )}
          <span className={`badge ${item.active ? 'badge-active' : 'badge-inactive'}`}>
            {item.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      <p className="client-card-meta">
        {item.document || 'Sem CPF/CNPJ'}
        {item.phone ? ` · ${item.phone}` : ''}
      </p>

      {(item.livestockCategory || item.animalType || item.animalSex) && (
        <div className="client-card-tags">
          {item.livestockCategory && (
            <span className="badge-tag">{item.livestockCategory}</span>
          )}
          {item.animalType && <span className="badge-tag">{item.animalType}</span>}
          {item.animalSex && <span className="badge-tag">{item.animalSex}</span>}
        </div>
      )}

      <p className="client-card-docs">
        {item.documentCount} documento{item.documentCount !== 1 ? 's' : ''}
        {item.propertyCount > 0
          ? ` · ${item.propertyCount} propriedade${item.propertyCount !== 1 ? 's' : ''}`
          : ''}
      </p>

      {expanded && (
        <div className="client-card-details">
          {detailsLoading && <p className="client-card-loading">Carregando detalhes…</p>}

          {!detailsLoading && display && (
            <>
              <dl className="client-card-detail-list">
                <div>
                  <dt>E-mail</dt>
                  <dd>{display.email?.trim() || '—'}</dd>
                </div>
                <div>
                  <dt>Endereço</dt>
                  <dd>{display.addressFull?.trim() || '—'}</dd>
                </div>
                <div>
                  <dt>Responsável</dt>
                  <dd>{display.responsible?.name || '—'}</dd>
                </div>
                {display.intentions.length > 0 && (
                  <div>
                    <dt>Intenções</dt>
                    <dd>{display.intentions.map((i) => i.label).join(', ')}</dd>
                  </div>
                )}
                {display.intentionNotes && (
                  <div>
                    <dt>Obs. intenção</dt>
                    <dd>{display.intentionNotes}</dd>
                  </div>
                )}
              </dl>

              {display.properties.length > 0 && (
                <div className="client-card-properties">
                  <p className="client-card-properties-title">Propriedades</p>
                  {display.properties.map((property, index) => (
                    <p key={property.id ?? index} className="client-card-property-item">
                      {property.farmName || `Propriedade ${index + 1}`}
                      {property.city || property.state
                        ? ` — ${[property.city, property.state].filter(Boolean).join('/')}`
                        : ''}
                    </p>
                  ))}
                </div>
              )}

              {display.notes && (
                <p className="client-card-notes">
                  <strong>Obs.:</strong> {display.notes}
                </p>
              )}
            </>
          )}

          {!detailsLoading && !display && (
            <p className="client-card-loading">Não foi possível carregar os detalhes.</p>
          )}
        </div>
      )}

      <div className="client-card-actions">
        <button type="button" className="ghost client-card-toggle" onClick={onToggleExpand}>
          {expanded ? 'Ver menos ▴' : 'Ver mais ▾'}
        </button>
        <button type="button" className="ghost" onClick={onEdit}>
          Editar
        </button>
        <Link
          href={`/clients/${item.id}`}
          className="ghost client-card-link"
          onClick={(e) => e.stopPropagation()}
        >
          Ficha completa →
        </Link>
      </div>
    </article>
  );
}

function ClientCardSkeleton() {
  return (
    <div className="client-card client-card--skeleton" aria-hidden="true">
      <div className="skeleton-line skeleton-line--title" />
      <div className="skeleton-line skeleton-line--short" />
      <div className="skeleton-line skeleton-line--medium" />
    </div>
  );
}

export function ClientGallery({ clients, loading, onEdit, onNewClient }: Props) {
  const queryClient = useQueryClient();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailsById, setDetailsById] = useState<Record<string, Client>>({});
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);

  const loadDetails = useCallback(
    async (id: string) => {
      setLoadingDetailsId(id);
      try {
        const client = await queryClient.fetchQuery({
          queryKey: queryKeys.clients.detail(id),
          queryFn: () => fetchJson<Client>(`/api/clients/${id}`),
        });
        setDetailsById((current) =>
          current[id] ? current : { ...current, [id]: client },
        );
      } catch {
        // mantém details null — card exibe mensagem de erro
      } finally {
        setLoadingDetailsId((current) => (current === id ? null : current));
      }
    },
    [queryClient],
  );

  function handleToggleExpand(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    if (!detailsById[id]) {
      void loadDetails(id);
    }
  }

  if (loading) {
    return (
      <div className="clients-grid" aria-busy="true" aria-label="Carregando clientes">
        {Array.from({ length: 8 }).map((_, i) => (
          <ClientCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="clients-empty card">
        <p>Nenhum cliente encontrado.</p>
        <button type="button" className="primary" onClick={onNewClient}>
          + Adicionar cliente
        </button>
      </div>
    );
  }

  return (
    <div className="clients-grid">
      {clients.map((client) => (
        <ClientCard
          key={client.id}
          item={client}
          expanded={expandedId === client.id}
          details={detailsById[client.id] ?? null}
          detailsLoading={loadingDetailsId === client.id}
          onToggleExpand={() => handleToggleExpand(client.id)}
          onEdit={() => onEdit(client)}
        />
      ))}
    </div>
  );
}
