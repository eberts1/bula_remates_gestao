'use client';

import { ANIMAL_SEXES, ANIMAL_TYPES, LIVESTOCK_CATEGORIES } from '@docs/shared';
import {
  ANIMAL_SEX_LABELS,
  ANIMAL_TYPE_LABELS,
  CATEGORY_LABELS,
} from '@/components/clients/ClientTagsSection';
import { buildScheduledAt } from '@/lib/auction-import-utils';
import type { AuctionImportRow } from '@/types/auction-import';

interface Props {
  rows: AuctionImportRow[];
  defaultYear: number;
  onChange: (rows: AuctionImportRow[]) => void;
}

export function AuctionImportPreviewTable({
  rows,
  defaultYear,
  onChange,
}: Props) {
  const selectedCount = rows.filter((row) => row.selected).length;
  const allSelected = rows.length > 0 && selectedCount === rows.length;

  function updateRow(index: number, patch: Partial<AuctionImportRow>) {
    const next = rows.map((row, i) => {
      if (i !== index) return row;
      const updated = { ...row, ...patch };
      if ('date' in patch || 'time' in patch) {
        updated.scheduledAt = buildScheduledAt(
          updated.date,
          updated.time,
          defaultYear,
        );
      }
      return updated;
    });
    onChange(next);
  }

  function toggleAll(selected: boolean) {
    onChange(rows.map((row) => ({ ...row, selected })));
  }

  function toggleCategory(index: number, category: string) {
    const row = rows[index];
    const categories = new Set(row.livestockCategories);
    if (categories.has(category)) categories.delete(category);
    else categories.add(category);
    updateRow(index, { livestockCategories: [...categories] });
  }

  return (
    <div className="auction-import-preview">
      <div className="auction-import-preview-header">
        <p>
          {selectedCount} de {rows.length} leilões selecionados para importar
        </p>
      </div>

      <div className="auction-import-table-wrap">
        <table className="auction-import-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                  aria-label="Selecionar todos"
                />
              </th>
              <th>Data</th>
              <th>Dia</th>
              <th>Leilão</th>
              <th>Hora</th>
              <th>Tipo</th>
              <th>Sexo</th>
              <th>Categorias de animais</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.rowIndex} className={row.selected ? '' : 'is-muted'}>
                <td>
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) =>
                      updateRow(index, { selected: e.target.checked })
                    }
                    aria-label={`Selecionar ${row.name}`}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="auction-import-cell-input"
                    value={row.date}
                    placeholder="DD/MM"
                    onChange={(e) => updateRow(index, { date: e.target.value })}
                  />
                </td>
                <td className="auction-import-readonly">{row.dayOfWeek || '—'}</td>
                <td>
                  <input
                    type="text"
                    className="auction-import-cell-input auction-import-cell-input--wide"
                    value={row.name}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="auction-import-cell-input"
                    value={row.time}
                    placeholder="HH:MM"
                    onChange={(e) => updateRow(index, { time: e.target.value })}
                  />
                </td>
                <td>
                  <select
                    className="auction-import-cell-select"
                    value={row.animalType ?? ''}
                    onChange={(e) =>
                      updateRow(index, {
                        animalType: e.target.value || null,
                      })
                    }
                  >
                    <option value="">—</option>
                    {ANIMAL_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {ANIMAL_TYPE_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <select
                    className="auction-import-cell-select"
                    value={row.animalSex ?? ''}
                    onChange={(e) =>
                      updateRow(index, {
                        animalSex: e.target.value || null,
                      })
                    }
                  >
                    <option value="">—</option>
                    {ANIMAL_SEXES.map((sex) => (
                      <option key={sex} value={sex}>
                        {ANIMAL_SEX_LABELS[sex]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <div className="auction-import-categories">
                    {LIVESTOCK_CATEGORIES.map((category) => (
                      <label
                        key={category}
                        className="auction-category-chip auction-import-category-chip"
                      >
                        <input
                          type="checkbox"
                          checked={row.livestockCategories.includes(category)}
                          onChange={() => toggleCategory(index, category)}
                        />
                        {CATEGORY_LABELS[category]}
                      </label>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
