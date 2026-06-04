'use client';

import { useMemo, useState } from 'react';
import type { ClientProperty } from '@/types/client';
import { emptyProperty } from '@/types/client';
import type { TenantIntention } from '@/types/client-import';
import type {
  HygieneClient,
  LocationProblem,
} from '@/types/client-hygiene';
import { ISSUE_LABELS, LOCATION_ISSUE_LABELS } from '@/types/client-hygiene';
import { CityUfField } from '@/components/clients/CityUfField';
import { ClientTagsSection } from '@/components/clients/ClientTagsSection';

interface Props {
  client: HygieneClient | null;
  intentions: TenantIntention[];
  onClose: () => void;
  onSaved: () => void;
  onSaveAndNext?: () => void;
  hasNext?: boolean;
}

interface EditState {
  name: string;
  document: string;
  email: string;
  phone: string;
  addressFull: string;
  properties: ClientProperty[];
  animalType: string;
  animalSex: string;
  livestockCategory: string;
  intentionIds: string[];
}

function toEditState(client: HygieneClient): EditState {
  return {
    name: client.name,
    document: client.document ?? '',
    email: client.email ?? '',
    phone: client.phone ?? '',
    addressFull: client.addressFull ?? '',
    properties:
      client.properties.length > 0
        ? client.properties.map((p) => ({ ...p }))
        : [emptyProperty()],
    animalType: client.animalType ?? '',
    animalSex: client.animalSex ?? '',
    livestockCategory: client.livestockCategory ?? '',
    intentionIds: client.intentions.map((i) => i.id),
  };
}

export function HygieneReviewDrawer({
  client,
  intentions,
  onClose,
  onSaved,
  onSaveAndNext,
  hasNext,
}: Props) {
  const [state, setState] = useState<EditState>(() =>
    client ? toEditState(client) : ({} as EditState),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const problemsByProperty = useMemo(() => {
    const map = new Map<string, LocationProblem>();
    for (const problem of client?.locationProblems ?? []) {
      map.set(problem.propertyId, problem);
    }
    return map;
  }, [client]);

  if (!client) return null;

  function updateProperty(index: number, patch: Partial<ClientProperty>) {
    setState((prev) => {
      const properties = [...prev.properties];
      properties[index] = { ...properties[index], ...patch };
      return { ...prev, properties };
    });
  }

  async function save(): Promise<boolean> {
    setLoading(true);
    setError('');
    const body = {
      name: state.name,
      document: state.document || undefined,
      email: state.email || undefined,
      phone: state.phone || undefined,
      addressFull: state.addressFull || undefined,
      animalType: state.animalType || null,
      animalSex: state.animalSex || null,
      livestockCategory: state.livestockCategory || null,
      intentionIds: state.intentionIds,
      properties: state.properties
        .filter((p) => p.farmName.trim() || p.city.trim() || p.state)
        .map((p) => ({
          farmName: p.farmName,
          city: p.city,
          state: p.state.toUpperCase(),
          routeNotes: p.routeNotes || undefined,
          phone: p.phone || undefined,
          ie: p.ie || undefined,
          nirf: p.nirf || undefined,
        })),
    };
    try {
      const res = await fetch(`/api/clients/${client!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao salvar');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar');
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (await save()) onSaved();
  }

  async function handleSaveAndNext() {
    if (await save()) onSaveAndNext?.();
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="hygiene-drawer-title"
      >
        <div className="drawer-header">
          <h2 id="hygiene-drawer-title" style={{ fontSize: '1.1rem' }}>
            {client.name}
          </h2>
          <button type="button" className="ghost" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="drawer-body">
          <div className="hygiene-issue-badges">
            {client.issues.map((issue) => (
              <span key={issue} className={`badge-tag issue-${issue}`}>
                {ISSUE_LABELS[issue]}
              </span>
            ))}
          </div>

          <div className="form-section-grid">
            <label>
              Nome
              <input
                value={state.name}
                onChange={(e) =>
                  setState((p) => ({ ...p, name: e.target.value }))
                }
              />
            </label>
            <label>
              Documento
              <input
                value={state.document}
                onChange={(e) =>
                  setState((p) => ({ ...p, document: e.target.value }))
                }
              />
            </label>
            <label>
              E-mail
              <input
                value={state.email}
                onChange={(e) =>
                  setState((p) => ({ ...p, email: e.target.value }))
                }
              />
            </label>
            <label>
              Telefone
              <input
                value={state.phone}
                onChange={(e) =>
                  setState((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </label>
            <label className="form-full-width">
              Endereço
              <input
                value={state.addressFull}
                onChange={(e) =>
                  setState((p) => ({ ...p, addressFull: e.target.value }))
                }
              />
            </label>
          </div>

          <h3 className="form-section-title" style={{ marginTop: '1.25rem' }}>
            Propriedades
          </h3>
          {state.properties.map((prop, index) => {
            const problem = prop.id
              ? problemsByProperty.get(prop.id)
              : undefined;
            return (
              <div key={prop.id ?? `new-${index}`} className="property-card">
                <label>
                  Fazenda
                  <input
                    value={prop.farmName}
                    onChange={(e) =>
                      updateProperty(index, { farmName: e.target.value })
                    }
                  />
                </label>
                <CityUfField
                  city={prop.city}
                  state={prop.state}
                  invalid={Boolean(problem)}
                  suggestions={problem?.suggestions}
                  onChange={(next) => updateProperty(index, next)}
                />
                {problem && (
                  <p className="city-uf-warning">
                    {LOCATION_ISSUE_LABELS[problem.issue]}
                  </p>
                )}
              </div>
            );
          })}

          <h3 className="form-section-title" style={{ marginTop: '1.25rem' }}>
            Etiquetas
          </h3>
          <ClientTagsSection
            value={{
              animalType: state.animalType,
              animalSex: state.animalSex,
              livestockCategory: state.livestockCategory,
              intentionIds: state.intentionIds,
            }}
            intentions={intentions}
            onChange={(value) =>
              setState((p) => ({
                ...p,
                animalType: value.animalType,
                animalSex: value.animalSex,
                livestockCategory: value.livestockCategory,
                intentionIds: value.intentionIds,
              }))
            }
          />

          {error && <p className="error">{error}</p>}
        </div>

        <div className="drawer-footer">
          <button type="button" className="ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="primary"
            disabled={loading}
            onClick={() => void handleSave()}
          >
            {loading ? 'Salvando…' : 'Salvar'}
          </button>
          {hasNext && onSaveAndNext && (
            <button
              type="button"
              className="ghost"
              disabled={loading}
              onClick={() => void handleSaveAndNext()}
            >
              Salvar e próximo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
