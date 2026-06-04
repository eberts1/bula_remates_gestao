'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ClientProperty } from '@/types/client';
import type { TenantIntention } from '@/types/client-import';
import type {
  HygieneClient,
  LocationProblem,
} from '@/types/client-hygiene';
import { ISSUE_LABELS, LOCATION_ISSUE_LABELS } from '@/types/client-hygiene';
import { CityUfField } from '@/components/clients/CityUfField';
import { ClientTagsSection } from '@/components/clients/ClientTagsSection';
import {
  isHygieneEditDirty,
  toHygieneEditState,
  type HygieneEditState,
} from '@/components/clients/hygiene-edit-state';

interface Props {
  client: HygieneClient | null;
  intentions: TenantIntention[];
  onClose: () => void;
  onSaved: () => void;
  onSaveAndNext?: () => void;
  hasNext?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

const UNSAVED_MESSAGE =
  'Há alterações não salvas. Deseja sair sem salvar as mudanças?';

export function HygieneReviewDrawer({
  client,
  intentions,
  onClose,
  onSaved,
  onSaveAndNext,
  hasNext,
  onDirtyChange,
}: Props) {
  const initialState = useMemo(
    () => (client ? toHygieneEditState(client) : null),
    [client],
  );

  const [state, setState] = useState<HygieneEditState>(() =>
    initialState ?? ({} as HygieneEditState),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialState) setState(initialState);
  }, [initialState]);

  const isDirty = useMemo(
    () =>
      initialState ? isHygieneEditDirty(initialState, state) : false,
    [initialState, state],
  );

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  const requestClose = useCallback(() => {
    if (isDirty && !window.confirm(UNSAVED_MESSAGE)) return;
    onClose();
  }, [isDirty, onClose]);

  useEffect(() => {
    if (!client) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') requestClose();
    }

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [client, requestClose]);

  const problemsByProperty = useMemo(() => {
    const map = new Map<string, LocationProblem>();
    for (const problem of client?.locationProblems ?? []) {
      map.set(problem.propertyId, problem);
    }
    return map;
  }, [client]);

  if (!client || !initialState) return null;

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
    <div className="client-drawer-root" role="presentation">
      <aside
        className="client-drawer client-drawer--fullscreen"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hygiene-drawer-title"
      >
        <header className="client-drawer-header">
          <div>
            <h2 id="hygiene-drawer-title">{client.name}</h2>
            {isDirty && (
              <p className="hygiene-drawer-unsaved" role="status">
                Alterações não salvas
              </p>
            )}
          </div>
          <button
            type="button"
            className="ghost client-drawer-close"
            onClick={requestClose}
          >
            ✕
          </button>
        </header>

        <div className="client-drawer-body">
          <div className="client-drawer-inner hygiene-review-layout">
            <div className="hygiene-issue-badges">
              {client.issues.map((issue) => (
                <span key={issue} className={`badge-tag issue-${issue}`}>
                  {ISSUE_LABELS[issue]}
                </span>
              ))}
            </div>

            <div className="hygiene-review-grid">
              <section className="card hygiene-review-section">
                <h3 className="form-section-title">Dados pessoais</h3>
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
                        setState((p) => ({
                          ...p,
                          addressFull: e.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="card hygiene-review-section">
                <h3 className="form-section-title">Propriedades</h3>
                {state.properties.map((prop, index) => {
                  const problem = prop.id
                    ? problemsByProperty.get(prop.id)
                    : undefined;
                  return (
                    <div
                      key={prop.id ?? `new-${index}`}
                      className="property-card"
                    >
                      <label>
                        Fazenda
                        <input
                          value={prop.farmName}
                          onChange={(e) =>
                            updateProperty(index, {
                              farmName: e.target.value,
                            })
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

                <h3
                  className="form-section-title"
                  style={{ marginTop: '1.25rem' }}
                >
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
              </section>
            </div>

            {error && <p className="error">{error}</p>}

            <div className="hygiene-review-footer">
              <button type="button" className="ghost" onClick={requestClose}>
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
      </aside>
    </div>
  );
}
