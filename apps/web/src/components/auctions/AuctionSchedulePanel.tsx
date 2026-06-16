'use client';

import {
  ANIMAL_SEX_LABELS,
  ANIMAL_TYPE_LABELS,
  CATEGORY_LABELS,
} from '@/components/clients/ClientTagsSection';
import {
  useAuctionSchedule,
  useImportScheduleRows,
} from '@/hooks/use-auction-schedule';
import type { AuctionScheduleRow } from '@/types/auction-schedule';

function formatRowTags(row: AuctionScheduleRow) {
  const parts: string[] = [];
  if (row.animalType) {
    parts.push(ANIMAL_TYPE_LABELS[row.animalType] ?? row.animalType);
  }
  if (row.animalSex) {
    parts.push(ANIMAL_SEX_LABELS[row.animalSex] ?? row.animalSex);
  }
  if (row.livestockCategories.length > 0) {
    parts.push(
      row.livestockCategories
        .map((category) => CATEGORY_LABELS[category] ?? category)
        .join(', '),
    );
  }
  return parts.length > 0 ? parts.join(' · ') : 'Sem filtros de match';
}

interface Props {
  onImported?: () => void;
}

export function AuctionSchedulePanel({ onImported }: Props) {
  const { data, isLoading, error, refetch, isFetching } = useAuctionSchedule();
  const importRows = useImportScheduleRows();

  const rows = data?.rows ?? [];
  const pendingRows = rows.filter((row) => !row.alreadyImported);

  async function handleImport(selected: AuctionScheduleRow[]) {
    if (!selected.length) return;
    await importRows.mutateAsync(selected);
    await refetch();
    onImported?.();
  }

  return (
    <section className="auction-schedule-panel card">
      <header className="auction-schedule-header">
        <div>
          <h3>Previstos na planilha</h3>
          <p>
            Fonte auxiliar do Google Sheets. Adicionar aqui nao altera a planilha
            original.
          </p>
        </div>
        <div className="auction-schedule-actions">
          <button
            type="button"
            className="ghost"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? 'Atualizando…' : 'Atualizar planilha'}
          </button>
          <button
            type="button"
            disabled={importRows.isPending || pendingRows.length === 0}
            onClick={() => void handleImport(pendingRows)}
          >
            {importRows.isPending
              ? 'Adicionando…'
              : `Adicionar todos (${pendingRows.length})`}
          </button>
        </div>
      </header>

      {error && (
        <p className="error">
          {error instanceof Error ? error.message : 'Erro ao carregar planilha'}
        </p>
      )}

      {isLoading && !data ? (
        <p>Carregando planilha…</p>
      ) : rows.length === 0 ? (
        <p className="auction-schedule-empty">
          Nenhum leilao encontrado na planilha.
        </p>
      ) : (
        <>
          <div className="auction-schedule-meta">
            <span>{data?.meta.pendingCount ?? 0} pendente(s)</span>
            <span>{data?.meta.importedCount ?? 0} ja adicionado(s)</span>
          </div>

          <div className="auction-schedule-list">
            {rows.map((row) => (
              <article
                key={`${row.externalKey}-${row.rowIndex}`}
                className={`auction-schedule-row${row.alreadyImported ? ' is-imported' : ''}`}
              >
                <div className="auction-schedule-row-main">
                  <div className="auction-schedule-row-title">
                    <strong>{row.name}</strong>
                    {row.isBulaRemates && (
                      <span className="auction-bula-badge">Bula Remates</span>
                    )}
                    {row.alreadyImported && (
                      <span className="auction-schedule-badge">Adicionado</span>
                    )}
                  </div>
                  <p>
                    {row.date}
                    {row.time ? ` · ${row.time}` : ''}
                    {row.dayOfWeek ? ` · ${row.dayOfWeek}` : ''}
                  </p>
                  <p className="auction-schedule-tags">{formatRowTags(row)}</p>
                </div>

                {!row.alreadyImported && (
                  <button
                    type="button"
                    className="ghost"
                    disabled={importRows.isPending}
                    onClick={() => void handleImport([row])}
                  >
                    Adicionar
                  </button>
                )}
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
