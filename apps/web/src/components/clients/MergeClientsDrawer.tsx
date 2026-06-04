'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ClientProperty } from '@/types/client';
import type { TenantIntention } from '@/types/client-import';
import type { DuplicateGroup, MergeResolution } from '@/types/client-hygiene';
import { CityUfField } from '@/components/clients/CityUfField';
import { ClientTagsSection } from '@/components/clients/ClientTagsSection';
import {
  ANIMAL_TYPE_LABELS,
  CATEGORY_LABELS,
} from '@/components/clients/ClientTagsSection';
import {
  buildCombinedMergeState,
  clusterClientsByExactName,
  collectFieldOptions,
  computeClientRichness,
  filterDuplicateGroup,
  formatClientLabel,
  initialSelectedIdSet,
  previewAlternateContacts,
  recommendMaster,
  type FieldOption,
  type NameCluster,
} from '@/components/clients/merge-clients-state';

interface Props {
  group: DuplicateGroup | null;
  initialSelectedIds?: string[] | null;
  intentions: TenantIntention[];
  onClose: () => void;
  onMerged: () => void;
}

function FieldPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: FieldOption[];
  onChange: (value: string) => void;
}) {
  if (options.length === 0) {
    return (
      <label>
        {label}
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nenhum cadastro tem este dado — digite se quiser"
        />
      </label>
    );
  }

  return (
    <fieldset className="merge-field-picker">
      <legend>{label}</legend>
      {options.map((opt) => (
        <label
          key={`${opt.clientId}-${opt.value}-${opt.clientIndex}`}
          className="merge-field-option"
        >
          <input
            type="radio"
            name={`merge-${label}`}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
          />
          <span>
            <strong>{opt.value}</strong>
            <span className="hygiene-subtle"> — {opt.clientLabel}</span>
          </span>
        </label>
      ))}
      <label className="merge-field-option merge-field-custom">
        <span className="hygiene-subtle">Outro valor</span>
        <input
          type="text"
          placeholder="Digite manualmente…"
          value={options.some((o) => o.value === value) ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (options.some((o) => o.value === value)) onChange('');
          }}
        />
      </label>
    </fieldset>
  );
}

function ClientCompareCard({
  client,
  index,
  richness,
  included,
  isMaster,
  recommended,
  onToggleInclude,
  onSetMaster,
}: {
  client: DuplicateGroup['clients'][0];
  index: number;
  richness: ReturnType<typeof computeClientRichness>;
  included: boolean;
  isMaster: boolean;
  recommended: boolean;
  onToggleInclude: () => void;
  onSetMaster: () => void;
}) {
  const pct = Math.round(
    (richness.filledFields / Math.max(richness.totalFields, 1)) * 100,
  );

  return (
    <div
      className={`merge-compare-card${isMaster ? ' merge-compare-card--selected' : ''}${!included ? ' merge-compare-card--excluded' : ''}${recommended && included ? ' merge-compare-card--recommended' : ''}`}
    >
      <label className="merge-compare-include">
        <input
          type="checkbox"
          checked={included}
          onChange={onToggleInclude}
        />
        Incluir nesta unificação
      </label>
      <div className="merge-compare-card-top">
        <span className="merge-compare-index">#{index + 1}</span>
        {recommended && (
          <span className="badge-tag merge-recommended-badge">Recomendado</span>
        )}
        <span className="merge-compare-score">{pct}% preenchido</span>
      </div>
      <strong className="merge-compare-name">{client.name}</strong>
      <dl className="merge-compare-dl">
        <div>
          <dt>Documento</dt>
          <dd>{client.document?.trim() || '—'}</dd>
        </div>
        <div>
          <dt>E-mail</dt>
          <dd>{client.email?.trim() || '—'}</dd>
        </div>
        <div>
          <dt>Telefone</dt>
          <dd>{client.phone?.trim() || '—'}</dd>
        </div>
        <div>
          <dt>Fazendas</dt>
          <dd>
            {client.properties.length === 0
              ? '—'
              : `${client.properties.length} · ${client.properties[0].farmName}`}
          </dd>
        </div>
        <div>
          <dt>Documentos anexos</dt>
          <dd>{client.documentCount > 0 ? client.documentCount : '—'}</dd>
        </div>
      </dl>
      {richness.details.length > 0 && (
        <p className="merge-compare-details hygiene-subtle">
          {richness.details.join(' · ')}
        </p>
      )}
      <button
        type="button"
        className={`ghost merge-set-master${isMaster ? ' active' : ''}`}
        disabled={!included}
        onClick={onSetMaster}
      >
        {isMaster ? 'Cadastro principal' : 'Definir como principal'}
      </button>
    </div>
  );
}

function ClusterSelectButton({
  cluster,
  selectedCount,
  onSelect,
}: {
  cluster: NameCluster;
  selectedCount: number;
  onSelect: () => void;
}) {
  const labels = cluster.indices.map((i) => `#${i + 1}`).join(', ');
  return (
    <button type="button" className="ghost merge-cluster-btn" onClick={onSelect}>
      Só {cluster.displayName} ({labels})
      {selectedCount === cluster.clientIds.length ? ' ✓' : ''}
    </button>
  );
}

export function MergeClientsDrawer({
  group,
  initialSelectedIds,
  intentions,
  onClose,
  onMerged,
}: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    group ? initialSelectedIdSet(group, initialSelectedIds) : new Set(),
  );
  const [masterId, setMasterId] = useState('');
  const [resolved, setResolved] = useState<MergeResolution | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const nameClusters = useMemo(
    () => (group ? clusterClientsByExactName(group.clients) : []),
    [group],
  );

  const mergeableClusters = useMemo(
    () => nameClusters.filter((c) => c.indices.length >= 2),
    [nameClusters],
  );

  const selectedGroup = useMemo(() => {
    if (!group) return null;
    return filterDuplicateGroup(group, [...selectedIds]);
  }, [group, selectedIds]);

  const recommendation = useMemo(
    () =>
      selectedGroup && selectedGroup.clients.length >= 2
        ? recommendMaster(selectedGroup, group?.clients)
        : null,
    [selectedGroup, group],
  );

  const richnessList = useMemo(
    () => group?.clients.map((c, i) => computeClientRichness(c, i)) ?? [],
    [group],
  );

  const applyCombined = useCallback(() => {
    if (!selectedGroup || selectedGroup.clients.length === 0) return;
    setResolved(buildCombinedMergeState(selectedGroup));
  }, [selectedGroup]);

  useEffect(() => {
    if (!group || group.clients.length === 0) {
      setSelectedIds(new Set());
      setMasterId('');
      setResolved(null);
      return;
    }

    const initial = initialSelectedIdSet(group, initialSelectedIds);
    setSelectedIds(initial);

    const subset = filterDuplicateGroup(group, [...initial]);
    if (subset.clients.length < 2) {
      setMasterId('');
      setResolved(null);
      return;
    }
    const rec = recommendMaster(subset, group.clients);
    if (rec) {
      setMasterId(rec.masterId);
      setResolved(buildCombinedMergeState(subset));
    }
  }, [group, initialSelectedIds]);

  useEffect(() => {
    if (!selectedGroup || selectedGroup.clients.length < 2) return;
    if (!selectedGroup.clients.some((c) => c.id === masterId)) {
      const rec = recommendMaster(selectedGroup, group?.clients);
      if (rec) setMasterId(rec.masterId);
    }
  }, [selectedIds, group, masterId, selectedGroup]);

  useEffect(() => {
    if (!selectedGroup || selectedGroup.clients.length < 2) return;
    setResolved(buildCombinedMergeState(selectedGroup));
  }, [selectedIds, group, selectedGroup]);

  const requestClose = useCallback(() => {
    if (loading) return;
    onClose();
  }, [loading, onClose]);

  useEffect(() => {
    if (!group) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') requestClose();
    }

    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [group, requestClose]);

  const fieldOptions = useMemo(() => {
    if (!selectedGroup) return null;
    return {
      name: collectFieldOptions(selectedGroup.clients, 'name'),
      document: collectFieldOptions(selectedGroup.clients, 'document'),
      email: collectFieldOptions(selectedGroup.clients, 'email'),
      phone: collectFieldOptions(selectedGroup.clients, 'phone'),
      addressFull: collectFieldOptions(selectedGroup.clients, 'addressFull'),
    };
  }, [selectedGroup]);

  const alternateContacts = useMemo(() => {
    if (!selectedGroup || !resolved) return [];
    return previewAlternateContacts(
      selectedGroup.clients,
      resolved.email ?? null,
      resolved.phone ?? null,
    );
  }, [selectedGroup, resolved]);

  const selectedCount = selectedIds.size;
  const hasMultiplePeople = mergeableClusters.length >= 2;
  const distinctNamesInSelection = useMemo(() => {
    if (!selectedGroup) return 0;
    return new Set(
      selectedGroup.clients.map((c) => c.name.trim().toUpperCase()),
    ).size;
  }, [selectedGroup]);

  if (
    !group ||
    !resolved ||
    !fieldOptions ||
    !recommendation ||
    !selectedGroup ||
    selectedGroup.clients.length < 2
  ) {
    return null;
  }

  const mergedIds = [...selectedIds].filter((id) => id !== masterId);
  const excludedCount = group.clients.length - selectedCount;

  const propertiesWithSource = resolved.properties ?? [];

  function updateProperty(index: number, patch: Partial<ClientProperty>) {
    setResolved((prev) => {
      if (!prev?.properties) return prev;
      const properties = [...prev.properties];
      properties[index] = { ...properties[index], ...patch };
      return { ...prev, properties };
    });
  }

  function removeProperty(index: number) {
    setResolved((prev) => {
      if (!prev?.properties) return prev;
      const properties = prev.properties.filter((_, i) => i !== index);
      return { ...prev, properties };
    });
  }

  function applyRecommendation() {
    if (!recommendation || !group) return;
    setMasterId(recommendation.masterId);
    applyCombined();
  }

  function selectCluster(cluster: NameCluster) {
    setSelectedIds(new Set(cluster.clientIds));
  }

  function toggleClientIncluded(clientId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(clientId)) {
        if (next.size <= 2) return prev;
        next.delete(clientId);
      } else {
        next.add(clientId);
      }
      return next;
    });
  }

  async function handleMerge() {
    if (!resolved || selectedCount < 2) return;
    if (distinctNamesInSelection > 1) {
      setError(
        'Selecione apenas cadastros da mesma pessoa. Unifique pai e filho em etapas separadas.',
      );
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/clients/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterId,
          mergedIds,
          resolved: {
            ...resolved,
            properties: (resolved.properties ?? []).map((p) => ({
              farmName: p.farmName,
              city: p.city,
              state: p.state.toUpperCase(),
              routeNotes: p.routeNotes || undefined,
              phone: p.phone || undefined,
              ie: p.ie || undefined,
              nirf: p.nirf || undefined,
            })),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao unificar');
      onMerged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao unificar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="client-drawer-root" role="presentation">
      <aside
        className="client-drawer client-drawer--fullscreen"
        role="dialog"
        aria-modal="true"
        aria-label="Unificar cadastros"
      >
        <header className="client-drawer-header">
          <div>
            <h2>Unificar cadastros</h2>
            <p className="hygiene-subtle" style={{ margin: '0.25rem 0 0' }}>
              Unificando {selectedCount} de {group.clients.length} registros —
              os não selecionados permanecem para outra unificação
            </p>
          </div>
          <button
            type="button"
            className="ghost client-drawer-close"
            onClick={requestClose}
            disabled={loading}
          >
            ✕
          </button>
        </header>

        <div className="client-drawer-body">
          <div className="client-drawer-inner hygiene-merge-layout">
            <div className="merge-info-banner card">
              <h3 className="form-section-title" style={{ marginTop: 0 }}>
                O que acontece ao unificar?
              </h3>
              <ul className="merge-info-list">
                <li>
                  <strong>Fazendas e intenções</strong> só dos cadastros{' '}
                  <strong>marcados para incluir</strong> vão para o principal
                  (cada pessoa mantém suas fazendas no cadastro dela).
                </li>
                <li>
                  <strong>Documentos anexos</strong> dos outros cadastros passam
                  para o principal.
                </li>
                <li>
                  Você escolhe um <strong>e-mail e telefone</strong> principal;
                  outros contatos vão para as observações do cliente.
                </li>
                <li>
                  Só os cadastros <strong>incluídos</strong> são arquivados; os
                  desmarcados continuam na lista (ex.: unifique o pai agora, o
                  filho depois).
                </li>
              </ul>
            </div>

            {hasMultiplePeople && (
              <div className="merge-split-warning card">
                <strong>Pessoas diferentes no mesmo grupo</strong>
                <p>
                  Provável pai e filho (ou sócios) com contato compartilhado.
                  Selecione apenas os cadastros de <strong>uma pessoa</strong> por
                  vez. Depois unifique a outra pessoa em uma segunda etapa.
                </p>
                <div className="merge-cluster-actions">
                  {mergeableClusters.map((cluster) => (
                    <ClusterSelectButton
                      key={cluster.normalizedName}
                      cluster={cluster}
                      selectedCount={selectedCount}
                      onSelect={() => selectCluster(cluster)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="merge-recommendation card">
              <div>
                <strong>Recomendação:</strong> usar{' '}
                <span className="merge-recommendation-target">
                  Cadastro #{recommendation.masterIndex + 1}
                </span>{' '}
                como principal — {recommendation.reason}.
              </div>
              <div className="merge-recommendation-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={applyRecommendation}
                >
                  Aplicar recomendação
                </button>
                <button type="button" className="ghost" onClick={applyCombined}>
                  Combinar dados de todos
                </button>
              </div>
            </div>

            <section className="card merge-section">
              <h3 className="form-section-title">
                Quais cadastros unificar agora?
              </h3>
              <p className="hygiene-subtle merge-section-hint">
                Marque só registros da mesma pessoa. O principal permanece ativo;
                os outros marcados serão arquivados.
                {excludedCount > 0 &&
                  ` (${excludedCount} ficam de fora desta etapa.)`}
              </p>
              <div className="merge-compare-grid">
                {group.clients.map((client, index) => (
                  <ClientCompareCard
                    key={client.id}
                    client={client}
                    index={index}
                    richness={richnessList[index]}
                    included={selectedIds.has(client.id)}
                    isMaster={masterId === client.id}
                    recommended={
                      recommendation.masterId === client.id &&
                      selectedIds.has(client.id)
                    }
                    onToggleInclude={() => toggleClientIncluded(client.id)}
                    onSetMaster={() => {
                      if (!selectedIds.has(client.id)) {
                        setSelectedIds((prev) => new Set(prev).add(client.id));
                      }
                      setMasterId(client.id);
                    }}
                  />
                ))}
              </div>
            </section>

            <section className="card merge-section">
              <h3 className="form-section-title">Dados do cadastro unificado</h3>
              <p className="hygiene-subtle merge-section-hint">
                Para cada campo, escolha o valor que deve ficar no cadastro
                final. Valores vazios em um cadastro podem existir em outro — use
                &quot;Combinar dados de todos&quot; para preencher automaticamente.
              </p>
              <div className="hygiene-merge-fields">
                <FieldPicker
                  label="Nome"
                  value={resolved.name}
                  options={fieldOptions.name}
                  onChange={(name) => setResolved((p) => p && { ...p, name })}
                />
                <FieldPicker
                  label="Documento"
                  value={resolved.document ?? ''}
                  options={fieldOptions.document}
                  onChange={(document) =>
                    setResolved((p) => p && { ...p, document: document || null })
                  }
                />
                <FieldPicker
                  label="E-mail"
                  value={resolved.email ?? ''}
                  options={fieldOptions.email}
                  onChange={(email) =>
                    setResolved((p) => p && { ...p, email: email || null })
                  }
                />
                <FieldPicker
                  label="Telefone"
                  value={resolved.phone ?? ''}
                  options={fieldOptions.phone}
                  onChange={(phone) =>
                    setResolved((p) => p && { ...p, phone: phone || null })
                  }
                />
                <FieldPicker
                  label="Endereço"
                  value={resolved.addressFull ?? ''}
                  options={fieldOptions.addressFull}
                  onChange={(addressFull) =>
                    setResolved((p) => p && { ...p, addressFull: addressFull || null })
                  }
                />
              </div>

              {alternateContacts.length > 0 && (
                <p className="merge-alternate-preview">
                  <strong>Contatos que irão para observações:</strong>{' '}
                  {alternateContacts.join('; ')}
                </p>
              )}
            </section>

            <section className="card merge-section">
              <h3 className="form-section-title">
                Propriedades reunidas ({propertiesWithSource.length})
              </h3>
              <p className="hygiene-subtle merge-section-hint">
                Todas as fazendas distintas dos cadastros. Remova só se for
                duplicata indesejada.
              </p>
              {propertiesWithSource.map((prop, index) => {
                const sourceIndex =
                  'sourceIndex' in prop &&
                  typeof (prop as { sourceIndex?: number }).sourceIndex ===
                    'number'
                    ? (prop as { sourceIndex: number }).sourceIndex
                    : null;
                return (
                  <div key={prop.id ?? `prop-${index}`} className="property-card">
                    <div className="merge-property-header">
                      <span className="hygiene-subtle">
                        Fazenda {index + 1}
                        {sourceIndex !== null &&
                          ` · origem: ${formatClientLabel(group.clients[sourceIndex], sourceIndex)}`}
                      </span>
                      <button
                        type="button"
                        className="ghost"
                        onClick={() => removeProperty(index)}
                      >
                        Remover
                      </button>
                    </div>
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
                      onChange={(next) => updateProperty(index, next)}
                    />
                  </div>
                );
              })}
            </section>

            <section className="card merge-section">
              <h3 className="form-section-title">Etiquetas (união de todos)</h3>
              <ClientTagsSection
                value={{
                  animalType: resolved.animalType ?? '',
                  animalSex: resolved.animalSex ?? '',
                  livestockCategory: resolved.livestockCategory ?? '',
                  intentionIds: resolved.intentionIds ?? [],
                }}
                intentions={intentions}
                onChange={(value) =>
                  setResolved((p) =>
                    p
                      ? {
                          ...p,
                          animalType: value.animalType || null,
                          animalSex: value.animalSex || null,
                          livestockCategory: value.livestockCategory || null,
                          intentionIds: value.intentionIds,
                        }
                      : p,
                  )
                }
              />
              {(resolved.animalType || resolved.livestockCategory) && (
                <p className="hygiene-subtle" style={{ marginTop: '0.5rem' }}>
                  {resolved.animalType &&
                    (ANIMAL_TYPE_LABELS[resolved.animalType] ??
                      resolved.animalType)}
                  {resolved.livestockCategory &&
                    ` · ${CATEGORY_LABELS[resolved.livestockCategory] ?? resolved.livestockCategory}`}
                </p>
              )}
            </section>

            {error && <p className="error">{error}</p>}

            <div className="hygiene-merge-actions">
              <button type="button" className="ghost" onClick={requestClose}>
                Cancelar
              </button>
              <button
                type="button"
                className="primary"
                disabled={
                  loading || !resolved.name.trim() || selectedCount < 2
                }
                onClick={() => void handleMerge()}
              >
                {loading
                  ? 'Unificando…'
                  : `Unificar ${selectedCount} cadastro(s) → #${group.clients.findIndex((c) => c.id === masterId) + 1}`}
              </button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
