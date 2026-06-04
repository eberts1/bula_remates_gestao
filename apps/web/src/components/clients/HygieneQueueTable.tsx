'use client';

import type { HygieneClient } from '@/types/client-hygiene';
import { ISSUE_LABELS } from '@/types/client-hygiene';
import {
  ANIMAL_TYPE_LABELS,
  CATEGORY_LABELS,
} from '@/components/clients/ClientTagsSection';

interface Props {
  clients: HygieneClient[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onReview: (client: HygieneClient) => void;
}

function primaryProperty(client: HygieneClient): string {
  const prop = client.properties[0];
  if (!prop) return '—';
  const parts = [prop.farmName, [prop.city, prop.state].filter(Boolean).join(' ')]
    .filter((part) => part && part.trim() && part !== '—')
    .join(' · ');
  return parts || '—';
}

export function HygieneQueueTable({
  clients,
  selectedIds,
  onToggleSelect,
  onToggleAll,
  onReview,
}: Props) {
  const allSelected =
    clients.length > 0 && clients.every((c) => selectedIds.has(c.id));

  return (
    <div className="hygiene-table-wrap">
      <table className="hygiene-table">
        <thead>
          <tr>
            <th className="hygiene-col-check">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label="Selecionar todos"
              />
            </th>
            <th>Cliente</th>
            <th>Propriedade</th>
            <th>Problemas</th>
            <th>Etiquetas</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td className="hygiene-col-check">
                <input
                  type="checkbox"
                  checked={selectedIds.has(client.id)}
                  onChange={() => onToggleSelect(client.id)}
                  aria-label={`Selecionar ${client.name}`}
                />
              </td>
              <td>
                <strong>{client.name}</strong>
                {client.document && (
                  <div className="hygiene-subtle">{client.document}</div>
                )}
              </td>
              <td className="hygiene-subtle">{primaryProperty(client)}</td>
              <td>
                <div className="hygiene-issue-badges">
                  {client.issues.map((issue) => (
                    <span key={issue} className={`badge-tag issue-${issue}`}>
                      {ISSUE_LABELS[issue]}
                    </span>
                  ))}
                </div>
              </td>
              <td>
                <div className="hygiene-issue-badges">
                  {client.animalType && (
                    <span className="badge-tag">
                      {ANIMAL_TYPE_LABELS[client.animalType] ??
                        client.animalType}
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
              </td>
              <td>
                <button
                  type="button"
                  className="ghost"
                  onClick={() => onReview(client)}
                >
                  Revisar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
