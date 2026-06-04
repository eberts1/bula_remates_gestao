'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { ClientImportUpload } from '@/components/clients/ClientImportUpload';
import { ImportBatchTagsPanel } from '@/components/clients/ImportBatchTagsPanel';
import { ImportConflictsPanel } from '@/components/clients/ImportConflictsPanel';
import { ImportPreviewTable } from '@/components/clients/ImportPreviewTable';
import { ImportColumnMappingInfo } from '@/components/clients/ImportColumnMappingInfo';
import { ImportProgressBar } from '@/components/clients/ImportProgressBar';
import { ImportReviewDrawer } from '@/components/clients/ImportReviewDrawer';
import { ImportSourceBadge } from '@/components/clients/ImportSourceBadge';
import type {
  BatchTags,
  CommitImportResult,
  ImportProgressState,
  ImportRow,
  ParseImportResponse,
  TenantIntention,
} from '@/types/client-import';
import {
  defaultResolutionForRow,
  defaultSelectedForRow,
} from '@/types/client-import';
import type { LivestockCategory } from '@docs/shared';

const COMMIT_CHUNK = 40;

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
  const { resolution, conflictClientId } = defaultResolutionForRow(
    raw.conflict,
  );
  return {
    ...raw,
    legacyCode: raw.legacyCode ?? null,
    groupKey: raw.groupKey ?? null,
    animalType: raw.animalType ?? (defaults.animalType || null),
    animalSex: raw.animalSex ?? (defaults.animalSex || null),
    livestockCategory:
      raw.livestockCategory ?? (defaults.livestockCategory || null),
    intentionIds:
      raw.intentionIds?.length ? raw.intentionIds : [...defaults.intentionIds],
    intentionNotes: (raw.intentionNotes ?? defaults.intentionNotes) || null,
    selected: defaultSelectedForRow(raw),
    resolution,
    conflictClientId,
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
    sourceLabel?: string;
  } | null>(null);
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [progress, setProgress] = useState<ImportProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CommitImportResult | null>(null);
  const [columnMapping, setColumnMapping] = useState<
    Record<string, number | undefined> | undefined
  >();

  const commitAbortRef = useRef<AbortController | null>(null);

  const busy =
    progress?.phase === 'parsing' || progress?.phase === 'committing';

  useEffect(() => {
    fetch('/api/tenant-intentions')
      .then((r) => r.json())
      .then((data) => setIntentions(data.items ?? []))
      .catch(() => {});
  }, []);

  const selectedCount = rows.filter((r) => r.selected).length;

  const handleParse = useCallback(
    async (file: File) => {
      setProgress({
        phase: 'parsing',
        current: 0,
        total: 0,
        label: 'Extraindo dados do arquivo…',
        indeterminate: true,
      });
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
          sourceLabel: data.sourceLabel,
        });
        setColumnMapping(data.columnMapping);
        setRows(data.rows.map((r) => toImportRow(r, tags)));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao importar');
      } finally {
        setProgress(null);
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

  function applyResolutionToConflicts(
    resolution: 'update' | 'skip' | 'create',
  ) {
    setRows((prev) =>
      prev.map((r) => {
        if (!r.conflict) return r;
        return {
          ...r,
          resolution,
          conflictClientId:
            resolution === 'update' ? r.conflict!.clientId : undefined,
          selected: resolution !== 'skip',
        };
      }),
    );
  }

  function cancelCommit() {
    commitAbortRef.current?.abort();
    commitAbortRef.current = null;
    setProgress(null);
    setError(
      'Importação cancelada. As linhas já salvas permanecem no cadastro.',
    );
  }

  async function handleCommit() {
    if (!fileMeta) return;
    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) {
      setError('Selecione ao menos uma linha para importar.');
      return;
    }

    const payloadRows = selected.map((r) => ({
      rowIndex: r.rowIndex,
      name: r.name,
      document: r.document,
      legacyCode: r.legacyCode,
      groupKey: r.groupKey,
      email: r.email,
      phone: r.phone,
      notes: r.notes,
      property: r.property,
      additionalProperties: r.additionalProperties,
      animalType: r.animalType,
      animalSex: r.animalSex,
      livestockCategory: r.livestockCategory,
      intentionIds: r.intentionIds,
      intentionNotes: r.intentionNotes,
      resolution: r.resolution,
      conflictClientId: r.conflictClientId,
      selected: true,
    }));

    const abort = new AbortController();
    commitAbortRef.current = abort;

    setProgress({
      phase: 'committing',
      current: 0,
      total: payloadRows.length,
      label: 'Salvando clientes…',
      indeterminate: false,
      importedCount: 0,
      updatedCount: 0,
      skippedCount: 0,
    });
    setError(null);

    try {
      const totals: CommitImportResult = {
        importedCount: 0,
        updatedCount: 0,
        skippedCount: 0,
      };

      for (let i = 0; i < payloadRows.length; i += COMMIT_CHUNK) {
        if (abort.signal.aborted) break;

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
          signal: abort.signal,
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

        const processed = Math.min(i + chunk.length, payloadRows.length);
        setProgress({
          phase: 'committing',
          current: processed,
          total: payloadRows.length,
          label: 'Salvando clientes…',
          indeterminate: false,
          importedCount: totals.importedCount,
          updatedCount: totals.updatedCount,
          skippedCount: totals.skippedCount,
        });
      }

      if (abort.signal.aborted) return;

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
          signal: abort.signal,
        });
      }

      setResult(totals);
      setRows((prev) => prev.filter((r) => !r.selected));
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Erro ao importar');
    } finally {
      commitAbortRef.current = null;
      setProgress(null);
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
        Extraia clientes de bases antigas (PDF ETB, listas de leilão, Excel),
        revise os dados e cadastre com etiquetas.{' '}
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
          <Link
            href="/clients/hygiene"
            style={{ fontSize: '0.875rem', display: 'block', marginTop: '0.35rem' }}
          >
            Ir para higienização →
          </Link>
        </div>
      )}

      {error && (
        <p style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</p>
      )}

      <ImportProgressBar
        progress={progress}
        onCancel={
          progress?.phase === 'committing' ? cancelCommit : undefined
        }
      />

      <ClientImportUpload onFile={handleParse} disabled={busy} />

      {(rows.length > 0 || fileMeta) && (
        <div className={busy ? 'import-workspace-busy' : undefined}>
          {fileMeta && (
            <ImportSourceBadge
              sourceType={fileMeta.sourceType}
              sourceLabel={fileMeta.sourceLabel}
              fileName={fileMeta.fileName}
              rowCount={rows.length}
            />
          )}

          {columnMapping && fileMeta?.sourceType === 'spreadsheet' && (
            <ImportColumnMappingInfo columnMapping={columnMapping} />
          )}

          <ImportConflictsPanel
            rows={rows}
            onApplyToConflicts={applyResolutionToConflicts}
          />

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
              {selectedCount} selecionado(s) de {rows.length}
            </p>
            <button
              type="button"
              className="primary"
              disabled={busy || selectedCount === 0}
              onClick={() => void handleCommit()}
            >
              {progress?.phase === 'committing'
                ? 'Importando…'
                : `Importar selecionados (${selectedCount})`}
            </button>
          </div>

          <ImportPreviewTable
            rows={rows}
            sourceType={fileMeta?.sourceType}
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
        </div>
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
