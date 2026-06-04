'use client';

import { useEffect, useRef, useState } from 'react';
import type { CityMatch } from '@/types/client-hygiene';

const BRAZIL_STATES = [
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
}

export function CityUfField({
  city,
  state,
  onChange,
  invalid,
  suggestions = [],
}: Props) {
  const [options, setOptions] = useState<CityMatch[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLLabelElement | null>(null);

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
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
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

  return (
    <div className="city-uf-field">
      <label className="city-uf-city" ref={boxRef}>
        Cidade
        <input
          value={city}
          onChange={(e) => {
            onChange({ city: e.target.value, state });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className={invalid ? 'city-uf-invalid' : undefined}
          autoComplete="off"
        />
        {open && options.length > 0 && (
          <ul className="city-uf-options">
            {options.map((o) => (
              <li key={o.id}>
                <button type="button" onClick={() => pick(o)}>
                  {o.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </label>

      <label className="city-uf-state">
        UF
        <select
          value={state}
          onChange={(e) => onChange({ city, state: e.target.value })}
        >
          <option value="">UF</option>
          {BRAZIL_STATES.map((uf) => (
            <option key={uf} value={uf}>
              {uf}
            </option>
          ))}
        </select>
      </label>

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
