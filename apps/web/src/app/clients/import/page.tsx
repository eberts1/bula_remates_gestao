'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ClientImportUpload } from '@/components/clients/ClientImportUpload';
import { ImportBatchTagsPanel } from '@/components/clients/ImportBatchTagsPanel';
import { ImportPreviewTable } from '@/components/clients/ImportPreviewTable';
import { ImportColumnMappingInfo } from '@/components/clients/ImportColumnMappingInfo';
import { ImportReviewDrawer } from '@/components/clients/ImportReviewDrawer';
import type {
  BatchTags,
  CommitImportResult,
  ImportRow,
  ParseImportResponse,
  TenantIntention,
} from '@/types/client-import';
import type { LivestockCategory } from '@docs/shared';

const emptyBatchTags = (): BatchTags => ({
  animalType: '',
  animalSex: '',
  livestockCategory: '',
  intentionIds: [],
  intentionNotes: '',
});

function toImportRow(
  raw: ParseImportResponse['rows'][number],
  defaults: BatchTags,
): ImportRow {
  return {
    ...raw,
    animalType: raw.animalType ?? (defaults.animalType || null),
    animalSex: raw.animalSex ?? (defaults.animalSex || null),
    livestockCategory:
      raw.livestockCategory ?? (defaults.livestockCategory || null),
    intentionIds:
      raw.intentionIds?.length ? raw.intentionIds : [...defaults.intentionIds],
    intentionNotes: (raw.intentionNotes ?? defaults.intentionNotes) || null,
    selected: !raw.needsReview && !raw.conflict,
    resolution: raw.conflict ? 'create' : 'create',
    conflictClientId: undefined,
  };
}

export default function ClientImportPage() {
  const [intentions, setIntentions] = useState<TenantIntention[]>([]);
  const [batchTags, setBatchTags] = useState<BatchTags>(emptyBatchTags);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileMeta, setFileMeta] = useState<{
    fileName: string;
    mimeType: string;
    sourceType: string;
  } | null>(null);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [parsing, setParsing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CommitImportResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<
    Record<string, number | undefined> | undefined
  >();

  useEffect(() => {
    fetch('/api/tenant-intentions')
      .then((r) => r.json())
      .then((data) => setIntentions(data.items ?? []))
      .catch(() => {});
  }, []);

  const selectedCount = rows.filter((r) => r.selected).length;

  const handleParse = useCallback(
    async (file: File) => {
      setParsing(true);
      setError(null);
      setResult(null);
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append(
          'sourceHints',
          JSON.stringify({
            animalType: batchTags.animalType || undefined,
            animalSex: batchTags.animalSex || undefined,
            livestockCategory: batchTags.livestockCategory || undefined,
            intentionIds: batchTags.intentionIds.length
              ? batchTags.intentionIds
              : undefined,
            intentionNotes: batchTags.intentionNotes || undefined,
          }),
        );

        const res = await fetch('/api/clients/import/parse', {
          method: 'POST',
          body: formData,
        });
        const data = (await res.json()) as ParseImportResponse & {
          message?: string;
        };
        if (!res.ok) throw new Error(data.message ?? 'Falha ao processar arquivo');

        const suggested = data.suggestedTags?.livestockCategory;
        const tags: BatchTags = {
          ...batchTags,
          livestockCategory:
            batchTags.livestockCategory ||
            (suggested as BatchTags['livestockCategory']) ||
            '',
        };
        if (suggested && !batchTags.livestockCategory) {
          setBatchTags(tags);
        }

        setFileMeta({
          fileName: data.fileName,
          mimeType: data.mimeType,
          sourceType: data.sourceType,
        });
        setColumnMapping(data.columnMapping);
        setRows(data.rows.map((r) => toImportRow(r, tags)));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao importar');
      } finally {
        setParsing(false);
      }
    },
    [batchTags],
  );

  function applyBatchToSelected() {
    setRows((prev) =>
      prev.map((r) =>
        r.selected
          ? {
              ...r,
              animalType: batchTags.animalType || r.animalType,
              animalSex: batchTags.animalSex || r.animalSex,
              livestockCategory:
                batchTags.livestockCategory || r.livestockCategory,
              intentionIds: batchTags.intentionIds.length
                ? [...batchTags.intentionIds]
                : r.intentionIds,
              intentionNotes:
                batchTags.intentionNotes || r.intentionNotes,
            }
          : r,
      ),
    );
  }

  async function handleCommit() {
    if (!fileMeta) return;
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) {
      setError('Selecione ao menos uma linha para importar.');
      return;
    }

    const COMMIT_CHUNK = 40;
    const payloadRows = selected.map((r) => ({
      rowIndex: r.rowIndex,
      name: r.name,
      document: r.document,
      email: r.email,
      phone: r.phone,
      notes: r.notes,
      property: r.property,
      animalType: r.animalType,
      animalSex: r.animalSex,
      livestockCategory: r.livestockCategory,
      intentionIds: r.intentionIds,
      intentionNotes: r.intentionNotes,
      resolution: r.resolution,
      conflictClientId: r.conflictClientId,
      selected: true,
    }));

    setCommitting(true);
    setError(null);
    try {
      const totals: CommitImportResult = {
        importedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
      };

      for (let i = 0; i < payloadRows.length; i += COMMIT_CHUNK) {
        const chunk = payloadRows.slice(i, i + COMMIT_CHUNK);
        const res = await fetch('/api/clients/import/commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: fileMeta.fileName,
            mimeType: fileMeta.mimeType,
            sourceType: fileMeta.sourceType,
            rows: chunk,
          }),
        });

        let data: CommitImportResult & { message?: string } = {
          importedCount: 0,
          updatedCount: 0,
          skippedCount: 0,
        };
        try {
          const text = await res.text();
          if (text.trim()) data = JSON.parse(text) as typeof data;
        } catch {
          /* resposta não-JSON */
        }
        if (!res.ok) {
          throw new Error(
            data.message ??
              `Falha ao salvar (lote ${Math.floor(i / COMMIT_CHUNK) + 1})`,
          );
        }

        totals.importedCount += data.importedCount ?? 0;
        totals.updatedCount += data.updatedCount ?? 0;
        totals.skippedCount += data.skippedCount ?? 0;
      }

      if (payloadRows.length > COMMIT_CHUNK) {
        await fetch('/api/clients/import/commit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: fileMeta.fileName,
            mimeType: fileMeta.mimeType,
            sourceType: fileMeta.sourceType,
            rows: [],
            batchSummary: {
              rowCount: selected.length,
              importedCount: totals.importedCount,
              updatedCount: totals.updatedCount,
              skippedCount: totals.skippedCount,
            },
          }),
        });
      }

      setResult(totals);
      setRows((prev) => prev.filter((r) => !r.selected));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao importar');
    } finally {
      setCommitting(false);
    }
  }

  const reviewRow = reviewIndex !== null ? rows[reviewIndex] : null;

  function saveReviewRow(updated: ImportRow) {
    if (reviewIndex === null) return;
    setRows((prev) => {
      const next = [...prev];
      next[reviewIndex] = updated;
      return next;
    });
  }

  function nextReviewWithIssues() {
    if (reviewIndex === null) return;
    const start = reviewIndex + 1;
    const idx = rows.findIndex(
      (r, i) =>
        i >= start && (r.needsReview || r.conflict || r.warnings.length > 0),
    );
    if (idx >= 0) setReviewIndex(idx);
    else setReviewIndex(null);
  }

  return (
    <AppShell title="Importar clientes">
      <p style={{ color: 'var(--muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
        Extraia clientes de bases antigas (PDF, Excel), revise os dados e cadastre
        com etiquetas para segmentar depois.{' '}
        <Link href="/clients">Voltar para clientes</Link>
      </p>

      {result && (
        <div className="import-result-banner">
          <strong>Importação concluída</strong>
          <p style={{ marginTop: '0.35rem', fontSize: '0.9rem' }}>
            {result.importedCount} criado(s) · {result.updatedCount} atualizado(s)
            · {result.skippedCount} ignorado(s)
          </p>
          <Link
            href={`/clients?livestockCategory=${batchTags.livestockCategory || ''}`}
            style={{ fontSize: '0.875rem' }}
          >
            Ver clientes importados →
          </Link>
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>
      )}

      <ClientImportUpload onFile={handleParse} disabled={parsing} />
      {parsing && (
        <p style={{ marginTop: '0.75rem', color: 'var(--muted)' }}>
          Extraindo dados do arquivo…
        </p>
      )}

      {(rows.length > 0 || fileMeta) && (
        <>
          {columnMapping && fileMeta?.sourceType === 'spreadsheet' && (
            <ImportColumnMappingInfo columnMapping={columnMapping} />
          )}

          <ImportBatchTagsPanel
            tags={batchTags}
            intentions={intentions}
            onChange={setBatchTags}
            onApplyToSelected={applyBatchToSelected}
            selectedCount={selectedCount}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '1rem',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
              {fileMeta?.fileName} — {rows.length} linha(s)
            </p>
            <button
              type="button"
              className="primary"
              disabled={committing || selectedCount === 0}
              onClick={() => void handleCommit()}
            >
              {committing
                ? 'Importando…'
                : `Importar selecionados (${selectedCount})`}
            </button>
          </div>

          <ImportPreviewTable
            rows={rows}
            onToggleAll={(checked) =>
              setRows((prev) => prev.map((r) => ({ ...r, selected: checked })))
            }
            onToggleRow={(i, checked) =>
              setRows((prev) => {
                const next = [...prev];
                next[i] = { ...next[i], selected: checked };
                return next;
              })
            }
            onReview={setReviewIndex}
          />
        </>
      )}

      <ImportReviewDrawer
        row={reviewRow}
        intentions={intentions}
        onClose={() => setReviewIndex(null)}
        onSave={saveReviewRow}
        hasNext={
          reviewIndex !== null &&
          rows.some(
            (r, i) =>
              i > reviewIndex &&
              (r.needsReview || r.conflict || r.warnings.length > 0),
          )
        }
        onSaveAndNext={() => {
          if (reviewRow) saveReviewRow(reviewRow);
          nextReviewWithIssues();
        }}
      />
    </AppShell>
  );
}
