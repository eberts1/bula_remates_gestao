'use client';

import type { ImportRow } from '@/types/client-import';

const CATEGORY_LABELS: Record<string, string> = {
  bezerra: 'Bezerra',
  bezerro: 'Bezerro',
  garrote: 'Garrote',
  novilha: 'Novilha',
  vaca: 'Vaca',
  touro: 'Touro',
  corte: 'Corte',
  elite: 'Elite',
  macho: 'Macho',
  femea: 'Fêmea',
};

interface Props {
  rows: ImportRow[];
  onToggleAll: (checked: boolean) => void;
  onToggleRow: (index: number, checked: boolean) => void;
  onReview: (index: number) => void;
}

export function ImportPreviewTable({
  rows,
  onToggleAll,
  onToggleRow,
  onReview,
}: Props) {
  const allSelected = rows.length > 0 && rows.every((r) => r.selected);

  return (
    <div className="import-table-wrap card">
      <div className="import-table-wrap">
        <table className="import-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => onToggleAll(e.target.checked)}
                />
              </th>
              <th>Status</th>
              <th>Nome</th>
              <th>Fazenda</th>
              <th>Cidade</th>
              <th>UF</th>
              <th>Etiquetas</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.rowIndex}>
                <td>
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) => onToggleRow(i, e.target.checked)}
                  />
                </td>
                <td>
                  {row.conflict && (
                    <span className="import-row-conflict" title="Conflito">
                      Conflito
                    </span>
                  )}
                  {row.needsReview && !row.conflict && (
                    <span className="import-row-warning">Revisar</span>
                  )}
                  {!row.conflict && !row.needsReview && 'OK'}
                </td>
                <td>{row.name}</td>
                <td>{row.property.farmName || '—'}</td>
                <td>{row.property.city || '—'}</td>
                <td>{row.property.state}</td>
                <td>
                  {row.livestockCategory && (
                    <span className="badge-tag">
                      {CATEGORY_LABELS[row.livestockCategory] ?? row.livestockCategory}
                    </span>
                  )}
                  {row.animalType && (
                    <span className="badge-tag">
                      {CATEGORY_LABELS[row.animalType] ?? row.animalType}
                    </span>
                  )}
                </td>
                <td>
                  <button
                    type="button"
                    className="ghost"
                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                    onClick={() => onReview(i)}
                  >
                    Revisar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <p style={{ padding: '1rem', color: 'var(--muted)' }}>
          Nenhuma linha extraída ainda.
        </p>
      )}
    </div>
  );
}
