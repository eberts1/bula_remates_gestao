'use client';

import type { ImportRow } from '@/types/client-import';
import { formatPropertyLabel } from '@/types/client-import';

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
  sourceType?: string;
  onToggleAll: (checked: boolean) => void;
  onToggleRow: (index: number, checked: boolean) => void;
  onReview: (index: number) => void;
}

export function ImportPreviewTable({
  rows,
  sourceType,
  onToggleAll,
  onToggleRow,
  onReview,
}: Props) {
  const allSelected = rows.length > 0 && rows.every((r) => r.selected);
  const showEtb =
    sourceType === 'etb_estancia_bahia' || rows.some((r) => r.legacyCode);

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
              {showEtb && <th>Cód.</th>}
              <th>Nome</th>
              {showEtb && <th>E-mail</th>}
              {showEtb ? (
                <>
                  <th>Propriedades</th>
                  <th>UF</th>
                </>
              ) : (
                <>
                  <th>Fazenda</th>
                  <th>Cidade</th>
                  <th>UF</th>
                </>
              )}
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
                {showEtb && <td>{row.legacyCode ?? '—'}</td>}
                <td>{row.name}</td>
                {showEtb && (
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {row.email ?? '—'}
                  </td>
                )}
                {showEtb && (
                  <td style={{ maxWidth: 220, fontSize: '0.78rem' }}>
                    {(row.additionalProperties?.length ?? 0) > 0 && (
                      <span
                        className="badge-tag"
                        style={{ marginBottom: '0.35rem', display: 'inline-block' }}
                      >
                        {(row.additionalProperties?.length ?? 0) + 1} fazendas
                      </span>
                    )}
                    <div>{formatPropertyLabel(row.property)}</div>
                    {(row.additionalProperties?.length ?? 0) > 0 &&
                      row.additionalProperties!.map((p, j) => (
                        <div
                          key={j}
                          style={{ color: 'var(--muted)', marginTop: '0.2rem' }}
                        >
                          {formatPropertyLabel(p)}
                        </div>
                      ))}
                  </td>
                )}
                {!showEtb && (
                  <>
                    <td>{row.property.farmName || '—'}</td>
                    <td>{row.property.city || '—'}</td>
                    <td>{row.property.state}</td>
                  </>
                )}
                {showEtb && <td>{row.property.state}</td>}
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
