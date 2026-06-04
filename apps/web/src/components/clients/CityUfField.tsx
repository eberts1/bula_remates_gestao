'use client';

import { useEffect, useRef, useState } from 'react';
import type { CityMatch } from '@/types/client-hygiene';

export const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

interface Props {
  city: string;
  state: string;
  onChange: (next: { city: string; state: string }) => void;
  invalid?: boolean;
  suggestions?: CityMatch[];
  required?: boolean;
}

export function CityUfField({
  city,
  state,
  onChange,
  invalid,
  suggestions = [],
  required = false,
}: Props) {
  const [options, setOptions] = useState<CityMatch[]>([]);
  const [open, setOpen] = useState(false);
  const fieldRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!state || !open) {
      setOptions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      const query = new URLSearchParams({ state });
      if (city.trim()) query.set('q', city.trim());
      fetch(`/api/geo/cities?${query}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => setOptions((data.items ?? []) as CityMatch[]))
        .catch(() => {});
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [city, state, open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (fieldRef.current && !fieldRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  function pick(match: CityMatch) {
    onChange({ city: match.name, state: match.state });
    setOpen(false);
  }

  const showOptions = open && options.length > 0;

  return (
    <div
      ref={fieldRef}
      className={`city-uf-field${showOptions ? ' city-uf-field--open' : ''}`}
    >
      <label className="city-uf-city">
        Cidade
        <input
          value={city}
          required={required}
          onChange={(e) => {
            onChange({ city: e.target.value, state });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className={invalid ? 'city-uf-invalid' : undefined}
          autoComplete="off"
          placeholder={state ? 'Digite para buscar…' : 'Selecione a UF'}
        />
      </label>

      <label className="city-uf-state">
        UF
        <select
          value={state}
          required={required}
          onChange={(e) => {
            onChange({ city, state: e.target.value });
            if (e.target.value) setOpen(true);
          }}
        >
          <option value="">UF</option>
          {BRAZIL_STATES.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </label>

      {showOptions && (
        <ul className="city-uf-options" role="listbox" aria-label="Cidades">
          {options.map((o) => (
            <li key={o.id} role="option">
              <button type="button" onClick={() => pick(o)}>
                {o.name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {suggestions.length > 0 && (
        <div className="city-uf-suggestions">
          <span>Sugestões:</span>
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              className="city-uf-chip"
              onClick={() => pick(s)}
            >
              {s.name} {s.state}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
