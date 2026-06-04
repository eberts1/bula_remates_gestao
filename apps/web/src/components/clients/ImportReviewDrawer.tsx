'use client';

import {
  ANIMAL_SEXES,
  ANIMAL_TYPES,
  LIVESTOCK_CATEGORIES,
} from '@docs/shared';
import type { ImportRow, TenantIntention } from '@/types/client-import';

const ANIMAL_TYPE_LABELS: Record<string, string> = {
  corte: 'Corte',
  elite: 'Elite',
};

const ANIMAL_SEX_LABELS: Record<string, string> = {
  macho: 'Macho',
  femea: 'Fêmea',
};

const CATEGORY_LABELS: Record<string, string> = {
  bezerra: 'Bezerra',
  bezerro: 'Bezerro',
  garrote: 'Garrote',
  novilha: 'Novilha',
  vaca: 'Vaca',
  touro: 'Touro',
};

const MATCH_LABELS: Record<string, string> = {
  legacy_code: 'Código legado igual',
  document: 'Documento igual',
  email: 'E-mail igual',
  phone: 'Telefone igual',
  name_city: 'Nome e cidade iguais',
};

interface Props {
  row: ImportRow | null;
  intentions: TenantIntention[];
  onClose: () => void;
  onSave: (row: ImportRow) => void;
  onSaveAndNext?: () => void;
  hasNext?: boolean;
}

export function ImportReviewDrawer({
  row,
  intentions,
  onClose,
  onSave,
  onSaveAndNext,
  hasNext,
}: Props) {
  if (!row) return null;

  const current = row;

  function patch(partial: Partial<ImportRow>) {
    onSave({ ...current, ...partial });
  }

  function patchProperty(field: keyof ImportRow['property'], value: string) {
    onSave({
      ...current,
      property: { ...current.property, [field]: value },
    });
  }

  function toggleIntention(id: string) {
    const set = new Set(current.intentionIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    patch({ intentionIds: [...set] });
  }

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div
        className="drawer-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="drawer-title"
      >
        <div className="drawer-header">
          <h2 id="drawer-title" style={{ fontSize: '1.1rem' }}>
            Revisar linha {row.rowIndex + 1}
          </h2>
          <button type="button" className="ghost" onClick={onClose}>
            Fechar
          </button>
        </div>

        <div className="drawer-body">
          {current.warnings.length > 0 && (
            <p className="import-row-warning" style={{ marginBottom: '1rem' }}>
              {current.warnings.join(' · ')}
            </p>
          )}

          {current.conflict && (
            <div className="conflict-box">
              <strong>Cliente já cadastrado</strong>
              <p style={{ marginTop: '0.35rem' }}>
                {current.conflict.existing.name}
                {current.conflict.existing.city
                  ? ` · ${current.conflict.existing.city}`
                  : ''}
              </p>
              <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                {MATCH_LABELS[current.conflict.matchReason]}
              </p>
              <label>
                <input
                  type="radio"
                  name="resolution"
                  checked={current.resolution === 'create'}
                  onChange={() =>
                    patch({ resolution: 'create', conflictClientId: undefined })
                  }
                />
                Criar novo cliente
              </label>
              <label>
                <input
                  type="radio"
                  name="resolution"
                  checked={current.resolution === 'update'}
                  onChange={() =>
                    patch({
                      resolution: 'update',
                      conflictClientId: current.conflict!.clientId,
                    })
                  }
                />
                Atualizar existente
              </label>
              <label>
                <input
                  type="radio"
                  name="resolution"
                  checked={current.resolution === 'skip'}
                  onChange={() => patch({ resolution: 'skip' })}
                />
                Ignorar esta linha
              </label>
            </div>
          )}

          <div className="form-section-grid">
            <label className="form-full-width">
              Nome
              <input
                value={current.name}
                onChange={(e) => patch({ name: e.target.value })}
              />
            </label>
            <label>
              Cód. legado
              <input
                value={current.legacyCode ?? ''}
                onChange={(e) =>
                  patch({ legacyCode: e.target.value || null })
                }
              />
            </label>
            <label>
              Documento
              <input
                value={current.document ?? ''}
                onChange={(e) =>
                  patch({ document: e.target.value || null })
                }
              />
            </label>
            <label>
              Telefone
              <input
                value={current.phone ?? ''}
                onChange={(e) => patch({ phone: e.target.value || null })}
              />
            </label>
            <label>
              E-mail
              <input
                value={current.email ?? ''}
                onChange={(e) => patch({ email: e.target.value || null })}
              />
            </label>
            <label className="form-full-width">
              Fazenda
              <input
                value={current.property.farmName}
                onChange={(e) => patchProperty('farmName', e.target.value)}
              />
            </label>
            <label>
              Cidade
              <input
                value={current.property.city}
                onChange={(e) => patchProperty('city', e.target.value)}
              />
            </label>
            <label>
              UF
              <input
                value={current.property.state}
                maxLength={2}
                onChange={(e) =>
                  patchProperty('state', e.target.value.toUpperCase())
                }
              />
            </label>
            <label>
              Tel. propriedade
              <input
                value={current.property.phone ?? ''}
                onChange={(e) => patchProperty('phone', e.target.value)}
              />
            </label>
            <label>
              Tipo animal
              <select
                value={current.animalType ?? ''}
                onChange={(e) =>
                  patch({
                    animalType: (e.target.value || null) as ImportRow['animalType'],
                  })
                }
              >
                <option value="">—</option>
                {ANIMAL_TYPES.map((v) => (
                  <option key={v} value={v}>
                    {ANIMAL_TYPE_LABELS[v]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Sexo
              <select
                value={current.animalSex ?? ''}
                onChange={(e) =>
                  patch({
                    animalSex: (e.target.value || null) as ImportRow['animalSex'],
                  })
                }
              >
                <option value="">—</option>
                {ANIMAL_SEXES.map((v) => (
                  <option key={v} value={v}>
                    {ANIMAL_SEX_LABELS[v]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Categoria
              <select
                value={current.livestockCategory ?? ''}
                onChange={(e) =>
                  patch({
                    livestockCategory: (e.target.value ||
                      null) as ImportRow['livestockCategory'],
                  })
                }
              >
                <option value="">—</option>
                {LIVESTOCK_CATEGORIES.map((v) => (
                  <option key={v} value={v}>
                    {CATEGORY_LABELS[v]}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-full-width">
              Observação (intenção)
              <input
                value={current.intentionNotes ?? ''}
                onChange={(e) =>
                  patch({ intentionNotes: e.target.value || null })
                }
              />
            </label>
            <label className="form-full-width">
              Notas
              <input
                value={current.notes ?? ''}
                onChange={(e) => patch({ notes: e.target.value || null })}
              />
            </label>
          </div>

          {intentions.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
                Intenções
              </span>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  marginTop: '0.35rem',
                }}
              >
                {intentions.map((i) => (
                  <label
                    key={i.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      fontSize: '0.875rem',
                      color: 'var(--text)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={current.intentionIds.includes(i.id)}
                      onChange={() => toggleIntention(i.id)}
                    />
                    {i.label}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="drawer-footer">
          <button type="button" className="ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="primary" onClick={() => onSave(current)}>
            Salvar
          </button>
          {hasNext && onSaveAndNext && (
            <button
              type="button"
              className="ghost"
              onClick={() => {
                onSave(current);
                onSaveAndNext();
              }}
            >
              Salvar e próximo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
