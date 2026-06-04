'use client';

import {
  ANIMAL_SEXES,
  ANIMAL_TYPES,
  LIVESTOCK_CATEGORIES,
} from '@docs/shared';
import type { TenantIntention } from '@/types/client-import';

export const ANIMAL_TYPE_LABELS: Record<string, string> = {
  corte: 'Corte',
  elite: 'Elite',
};

export const ANIMAL_SEX_LABELS: Record<string, string> = {
  macho: 'Macho',
  femea: 'Fêmea',
};

export const CATEGORY_LABELS: Record<string, string> = {
  bezerra: 'Bezerra',
  bezerro: 'Bezerro',
  garrote: 'Garrote',
  novilha: 'Novilha',
  vaca: 'Vaca',
  touro: 'Touro',
};

export interface ClientTagsValue {
  animalType: string;
  animalSex: string;
  livestockCategory: string;
  intentionIds: string[];
}

interface Props {
  value: ClientTagsValue;
  intentions: TenantIntention[];
  onChange: (value: ClientTagsValue) => void;
}

export function ClientTagsSection({ value, intentions, onChange }: Props) {
  function toggleIntention(id: string) {
    const set = new Set(value.intentionIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ ...value, intentionIds: [...set] });
  }

  return (
    <div className="client-tags-section">
      <div className="batch-tags-panel">
        <label>
          Tipo animal
          <select
            value={value.animalType}
            onChange={(e) => onChange({ ...value, animalType: e.target.value })}
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
            value={value.animalSex}
            onChange={(e) => onChange({ ...value, animalSex: e.target.value })}
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
            value={value.livestockCategory}
            onChange={(e) =>
              onChange({ ...value, livestockCategory: e.target.value })
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
                  checked={value.intentionIds.includes(i.id)}
                  onChange={() => toggleIntention(i.id)}
                />
                {i.label}
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
