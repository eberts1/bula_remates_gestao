'use client';

import type { ClientProperty } from '@/types/client';
import { emptyProperty } from '@/types/client';

interface Props {
  properties: ClientProperty[];
  onChange: (properties: ClientProperty[]) => void;
  minCount?: number;
}

const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export function ClientPropertiesSection({
  properties,
  onChange,
  minCount = 0,
}: Props) {
  function update(index: number, field: keyof ClientProperty, value: string) {
    const next = [...properties];
    next[index] = { ...next[index], [field]: value };
    onChange(next);
  }

  function addProperty() {
    onChange([...properties, emptyProperty()]);
  }

  function removeProperty(index: number) {
    if (properties.length <= minCount) return;
    onChange(properties.filter((_, i) => i !== index));
  }

  const list = properties.length > 0 ? properties : minCount > 0 ? [emptyProperty()] : [];

  return (
    <section className="form-section">
      <div className="form-section-header">
        <h3 className="form-section-title">Propriedades</h3>
        <button type="button" className="ghost" onClick={addProperty}>
          + Adicionar propriedade
        </button>
      </div>

      {list.length === 0 && (
        <p style={{ fontSize: '0.875rem', color: 'var(--muted)' }}>
          Nenhuma propriedade cadastrada.
        </p>
      )}

      {list.map((prop, index) => (
        <div key={prop.id ?? `new-${index}`} className="property-card">
          <div className="form-section-header">
            <strong>Propriedade {index + 1}</strong>
            {list.length > minCount && (
              <button
                type="button"
                className="ghost"
                onClick={() => removeProperty(index)}
              >
                Remover
              </button>
            )}
          </div>
          <div className="form-section-grid">
            <label>
              Nome da fazenda *
              <input
                required={minCount > 0}
                value={prop.farmName}
                onChange={(e) => update(index, 'farmName', e.target.value)}
              />
            </label>
            <label>
              Cidade *
              <input
                required={minCount > 0}
                value={prop.city}
                onChange={(e) => update(index, 'city', e.target.value)}
              />
            </label>
            <label>
              Estado *
              <select
                required={minCount > 0}
                value={prop.state}
                onChange={(e) => update(index, 'state', e.target.value)}
                style={{
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '0.65rem 0.85rem',
                  width: '100%',
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
            <label>
              Telefone da propriedade
              <input
                value={prop.phone}
                onChange={(e) => update(index, 'phone', e.target.value)}
              />
            </label>
            <label>
              Inscrição Estadual (IE)
              <input
                value={prop.ie}
                onChange={(e) => update(index, 'ie', e.target.value)}
              />
            </label>
            <label>
              NIRF
              <input
                value={prop.nirf}
                onChange={(e) => update(index, 'nirf', e.target.value)}
              />
            </label>
            <label className="form-full-width">
              Roteiro / como chegar
              <textarea
                value={prop.routeNotes}
                onChange={(e) => update(index, 'routeNotes', e.target.value)}
                rows={2}
                style={{
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '0.65rem 0.85rem',
                  width: '100%',
                  resize: 'vertical',
                }}
              />
            </label>
          </div>
        </div>
      ))}
    </section>
  );
}
