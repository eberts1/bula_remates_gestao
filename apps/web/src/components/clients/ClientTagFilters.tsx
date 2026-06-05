'use client';

import {
  ANIMAL_SEXES,
  ANIMAL_TYPES,
  LIVESTOCK_CATEGORIES,
} from '@docs/shared';
import { CityUfField } from '@/components/clients/CityUfField';
import type { TenantIntention } from '@/types/client-import';

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

export interface TagFilterValues {
  animalType: string;
  animalSex: string;
  livestockCategory: string;
  intentionId: string;
  nearCity: string;
  nearState: string;
  radiusKm: string;
}

export function countActiveFilters(values: TagFilterValues): number {
  let count = 0;
  if (values.animalType) count += 1;
  if (values.animalSex) count += 1;
  if (values.livestockCategory) count += 1;
  if (values.intentionId) count += 1;
  if (values.nearCity && values.nearState && values.radiusKm) count += 1;
  return count;
}

export function emptyTagFilters(): TagFilterValues {
  return {
    animalType: '',
    animalSex: '',
    livestockCategory: '',
    intentionId: '',
    nearCity: '',
    nearState: '',
    radiusKm: '',
  };
}

interface Props {
  values: TagFilterValues;
  intentions: TenantIntention[];
  onChange: (values: TagFilterValues) => void;
}

export function ClientTagFilters({ values, intentions, onChange }: Props) {
  function set(field: keyof TagFilterValues, value: string) {
    onChange({ ...values, [field]: value });
  }

  return (
    <div className="client-tag-filters">
      <label>
        Tipo
        <select
          value={values.animalType}
          onChange={(e) => set('animalType', e.target.value)}
        >
          <option value="">Todos</option>
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
          value={values.animalSex}
          onChange={(e) => set('animalSex', e.target.value)}
        >
          <option value="">Todos</option>
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
          value={values.livestockCategory}
          onChange={(e) => set('livestockCategory', e.target.value)}
        >
          <option value="">Todas</option>
          {LIVESTOCK_CATEGORIES.map((v) => (
            <option key={v} value={v}>
              {CATEGORY_LABELS[v]}
            </option>
          ))}
        </select>
      </label>
      <label>
        Intenção
        <select
          value={values.intentionId}
          onChange={(e) => set('intentionId', e.target.value)}
        >
          <option value="">Todas</option>
          {intentions.map((i) => (
            <option key={i.id} value={i.id}>
              {i.label}
            </option>
          ))}
        </select>
      </label>

      <div className="client-proximity-filter">
        <span className="client-proximity-label">Proximidade</span>
        <CityUfField
          city={values.nearCity}
          state={values.nearState}
          onChange={({ city, state }) =>
            onChange({ ...values, nearCity: city, nearState: state })
          }
        />
        <label>
          Raio (km)
          <input
            type="number"
            min={1}
            max={500}
            step={10}
            placeholder="ex: 100"
            value={values.radiusKm}
            onChange={(e) => set('radiusKm', e.target.value)}
          />
        </label>
      </div>
    </div>
  );
}
