'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { Client } from '@/types/client';

interface Props {
  clients: Client[];
  loading: boolean;
  onEdit: (client: Client) => void;
  onNewClient: () => void;
}

function ClientCard({
  client,
  expanded,
  onToggleExpand,
  onEdit,
}: {
  client: Client;
  expanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
}) {
  return (
    <article className={`client-card${expanded ? ' client-card--expanded' : ''}`}>
      <div className="client-card-header">
        <h3 className="client-card-name">{client.name}</h3>
        <div className="client-card-badges">
          {!client.isComplete && (
            <span className="badge badge-incomplete">Incompleto</span>
          )}
          <span className={`badge ${client.active ? 'badge-active' : 'badge-inactive'}`}>
            {client.active ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>

      <p className="client-card-meta">
        {client.document || 'Sem CPF/CNPJ'}
        {client.phone ? ` · ${client.phone}` : ''}
      </p>

      {(client.livestockCategory || client.animalType || client.animalSex) && (
        <div className="client-card-tags">
          {client.livestockCategory && (
            <span className="badge-tag">{client.livestockCategory}</span>
          )}
          {client.animalType && <span className="badge-tag">{client.animalType}</span>}
          {client.animalSex && <span className="badge-tag">{client.animalSex}</span>}
        </div>
      )}

      <p className="client-card-docs">
        {client.documentCount} documento{client.documentCount !== 1 ? 's' : ''}
      </p>

      {expanded && (
        <div className="client-card-details">
          <dl className="client-card-detail-list">
            <div>
              <dt>E-mail</dt>
              <dd>{client.email?.trim() || '—'}</dd>
            </div>
            <div>
              <dt>Endereço</dt>
              <dd>{client.addressFull?.trim() || '—'}</dd>
            </div>
            <div>
              <dt>Responsável</dt>
              <dd>{client.responsible?.name || '—'}</dd>
            </div>
            {client.intentions.length > 0 && (
              <div>
                <dt>Intenções</dt>
                <dd>{client.intentions.map((i) => i.label).join(', ')}</dd>
              </div>
            )}
            {client.intentionNotes && (
              <div>
                <dt>Obs. intenção</dt>
                <dd>{client.intentionNotes}</dd>
              </div>
            )}
          </dl>

          {client.properties.length > 0 && (
            <div className="client-card-properties">
              <p className="client-card-properties-title">Propriedades</p>
              {client.properties.map((property, index) => (
                <p key={property.id ?? index} className="client-card-property-item">
                  {property.farmName || `Propriedade ${index + 1}`}
                  {property.city || property.state
                    ? ` — ${[property.city, property.state].filter(Boolean).join('/')}`
                    : ''}
                </p>
              ))}
            </div>
          )}

          {client.notes && (
            <p className="client-card-notes">
              <strong>Obs.:</strong> {client.notes}
            </p>
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
          href={`/clients/${client.id}`}
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
          client={client}
          expanded={expandedId === client.id}
          onToggleExpand={() =>
            setExpandedId((current) => (current === client.id ? null : client.id))
          }
          onEdit={() => onEdit(client)}
        />
      ))}
    </div>
  );
}
