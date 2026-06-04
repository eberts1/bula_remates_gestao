'use client';

import {
  ANIMAL_SEXES,
  ANIMAL_TYPES,
  LIVESTOCK_CATEGORIES,
} from '@docs/shared';
import type { BatchTags, TenantIntention } from '@/types/client-import';

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

interface Props {
  tags: BatchTags;
  intentions: TenantIntention[];
  onChange: (tags: BatchTags) => void;
  onApplyToSelected: () => void;
  selectedCount: number;
}

export function ImportBatchTagsPanel({
  tags,
  intentions,
  onChange,
  onApplyToSelected,
  selectedCount,
}: Props) {
  function toggleIntention(id: string) {
    const set = new Set(tags.intentionIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ ...tags, intentionIds: [...set] });
  }

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <h3 className="form-section-title">Etiquetas do lote</h3>
      <div className="batch-tags-panel">
        <label>
          Tipo animal
          <select
            value={tags.animalType}
            onChange={(e) =>
              onChange({
                ...tags,
                animalType: e.target.value as BatchTags['animalType'],
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
            value={tags.animalSex}
            onChange={(e) =>
              onChange({
                ...tags,
                animalSex: e.target.value as BatchTags['animalSex'],
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
            value={tags.livestockCategory}
            onChange={(e) =>
              onChange({
                ...tags,
                livestockCategory: e.target.value as BatchTags['livestockCategory'],
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
      </div>
      {intentions.length > 0 && (
        <div style={{ marginTop: '0.75rem' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
            Intenções
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.35rem' }}>
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
                  checked={tags.intentionIds.includes(i.id)}
                  onChange={() => toggleIntention(i.id)}
                />
                {i.label}
              </label>
            ))}
          </div>
        </div>
      )}
      <label style={{ marginTop: '0.75rem' }}>
        Observação de intenção (lote)
        <input
          value={tags.intentionNotes}
          onChange={(e) => onChange({ ...tags, intentionNotes: e.target.value })}
          placeholder="Texto livre aplicado às linhas selecionadas"
        />
      </label>
      <button
        type="button"
        className="ghost"
        style={{ marginTop: '0.75rem' }}
        disabled={selectedCount === 0}
        onClick={onApplyToSelected}
      >
        Aplicar etiquetas às {selectedCount} linha(s) selecionada(s)
      </button>
    </div>
  );
}
