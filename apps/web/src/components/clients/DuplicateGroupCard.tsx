'use client';

import type { DuplicateGroup } from '@/types/client-hygiene';
import { DUPLICATE_REASON_LABELS } from '@/types/client-hygiene';
import {
  ANIMAL_TYPE_LABELS,
  CATEGORY_LABELS,
} from '@/components/clients/ClientTagsSection';
import {
  clusterClientsByExactName,
  computeClientRichness,
} from '@/components/clients/merge-clients-state';

interface Props {
  group: DuplicateGroup;
  onMerge: (group: DuplicateGroup, selectedIds?: string[]) => void;
}

function formatProperty(
  farmName: string,
  city: string,
  state: string,
): string {
  const loc = [city, state].filter(Boolean).join(' ');
  return [farmName, loc].filter(Boolean).join(' · ') || '—';
}

export function DuplicateGroupCard({ group, onMerge }: Props) {
  const nameClusters = clusterClientsByExactName(group.clients);
  const mergeableClusters = nameClusters.filter((c) => c.indices.length >= 2);
  const hasMultiplePeople = mergeableClusters.length >= 2;

  return (
    <div className="card hygiene-dup-card">
      <div className="hygiene-dup-card-header">
        <div>
          <h3 className="form-section-title" style={{ margin: 0 }}>
            {group.clients.length} cadastros possivelmente iguais
          </h3>
          {hasMultiplePeople && (
            <p className="merge-split-hint">
              Parece haver <strong>{mergeableClusters.length} pessoas</strong>{' '}
              diferentes (ex.: pai e filho). Unifique cada uma separadamente — as
              fazendas de cada uma ficam no cadastro correspondente.
            </p>
          )}
          <div className="hygiene-issue-badges" style={{ marginTop: '0.5rem' }}>
            {group.reasons.map((reason) => (
              <span key={reason} className="badge-tag issue-duplicates">
                {DUPLICATE_REASON_LABELS[reason]}
              </span>
            ))}
          </div>
        </div>
        {!hasMultiplePeople && (
          <button
            type="button"
            className="primary"
            onClick={() => onMerge(group)}
          >
            Unificar
          </button>
        )}
      </div>

      {hasMultiplePeople && (
        <div className="merge-cluster-actions">
          {mergeableClusters.map((cluster) => (
            <button
              key={cluster.normalizedName}
              type="button"
              className="primary"
              onClick={() => onMerge(group, cluster.clientIds)}
            >
              Unificar {cluster.displayName} ({cluster.indices.length}{' '}
              cadastros)
            </button>
          ))}
        </div>
      )}

      <div className="hygiene-dup-grid">
        {group.clients.map((client, index) => {
          const richness = computeClientRichness(client, index);
          const pct = Math.round(
            (richness.filledFields / Math.max(richness.totalFields, 1)) * 100,
          );
          return (
          <div key={client.id} className="hygiene-dup-client">
            <div className="hygiene-dup-client-header">
              <span className="merge-compare-index">#{index + 1}</span>
              <span className="hygiene-subtle">{pct}% preenchido</span>
            </div>
            <strong>{client.name}</strong>
            {client.document && (
              <div className="hygiene-subtle">Doc: {client.document}</div>
            )}
            {client.email && (
              <div className="hygiene-subtle">{client.email}</div>
            )}
            {client.phone && (
              <div className="hygiene-subtle">{client.phone}</div>
            )}
            {client.properties.length > 0 && (
              <ul className="hygiene-dup-properties">
                {client.properties.map((p) => (
                  <li key={p.id ?? `${p.farmName}-${p.city}`}>
                    {formatProperty(p.farmName, p.city, p.state)}
                  </li>
                ))}
              </ul>
            )}
            <div className="hygiene-issue-badges" style={{ marginTop: '0.35rem' }}>
              {client.animalType && (
                <span className="badge-tag">
                  {ANIMAL_TYPE_LABELS[client.animalType] ?? client.animalType}
                </span>
              )}
              {client.livestockCategory && (
                <span className="badge-tag">
                  {CATEGORY_LABELS[client.livestockCategory] ??
                    client.livestockCategory}
                </span>
              )}
              {client.intentions.map((i) => (
                <span key={i.id} className="badge-tag">
                  {i.label}
                </span>
              ))}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}
