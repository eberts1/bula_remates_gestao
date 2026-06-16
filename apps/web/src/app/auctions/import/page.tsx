'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { AuctionImportPreviewTable } from '@/components/auctions/AuctionImportPreviewTable';
import { AuctionImportUpload } from '@/components/auctions/AuctionImportUpload';
import { fetchAuthed } from '@/lib/client-auth';
import type {
  AuctionImportCommitResult,
  AuctionImportParseResponse,
  AuctionImportRow,
} from '@/types/auction-import';
import { toAuctionImportRow } from '@/types/auction-import';

export default function AuctionImportPage() {
  const router = useRouter();
  const [rows, setRows] = useState<AuctionImportRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [defaultYear, setDefaultYear] = useState(2026);
  const [phase, setPhase] = useState<
    'idle' | 'parsing' | 'preview' | 'committing' | 'done'
  >('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AuctionImportCommitResult | null>(null);

  const busy = phase === 'parsing' || phase === 'committing';
  const selectedCount = rows.filter((row) => row.selected).length;

  const handleParse = useCallback(async (file: File) => {
    setPhase('parsing');
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetchAuthed('/api/auctions/import/parse', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json()) as AuctionImportParseResponse & {
        message?: string;
      };

      if (!res.ok) {
        throw new Error(data.message ?? 'Falha ao processar a planilha');
      }

      if (!data.rows.length) {
        throw new Error(
          'Nenhum leilão encontrado na planilha. Verifique se o arquivo segue o formato da escala.',
        );
      }

      setRows(data.rows.map(toAuctionImportRow));
      setFileName(data.meta.fileName || file.name);
      setDefaultYear(data.meta.defaultYear ?? 2026);
      setPhase('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao processar arquivo');
      setPhase('idle');
    }
  }, []);

  async function handleCommit() {
    if (!fileName || !selectedCount) return;

    setPhase('committing');
    setError(null);

    try {
      const res = await fetchAuthed('/api/auctions/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          rows: rows.map((row) => ({
            name: row.name.trim(),
            scheduledAt: row.scheduledAt,
            animalType: row.animalType,
            animalSex: row.animalSex,
            livestockCategories: row.livestockCategories,
            selected: row.selected,
          })),
        }),
      });

      const data = (await res.json()) as AuctionImportCommitResult & {
        message?: string;
      };

      if (!res.ok) {
        throw new Error(data.message ?? 'Falha ao importar leilões');
      }

      setResult(data);
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao importar');
      setPhase('preview');
    }
  }

  function resetImport() {
    setRows([]);
    setFileName(null);
    setResult(null);
    setError(null);
    setPhase('idle');
  }

  return (
    <AppShell title="Importar leilões">
      <div className="auction-import-page">
        <div className="auction-page-toolbar">
          <div>
            <h2>Importar planilha de escala</h2>
            <p>
              Carregue a planilha de leilões, revise tipo, sexo e categorias, e
              confirme a importação.
            </p>
          </div>
          <Link href="/auctions" className="auction-back-link">
            Voltar para leilões
          </Link>
        </div>

        {error && <p className="error-banner">{error}</p>}

        {phase === 'done' && result ? (
          <div className="card auction-import-result">
            <h3>Importação concluída</h3>
            <p>
              {result.importedCount} leilão
              {result.importedCount === 1 ? '' : 'ões'} importado
              {result.importedCount === 1 ? '' : 's'} de{' '}
              <strong>{result.fileName}</strong>.
            </p>
            <div className="auction-import-actions">
              <button type="button" onClick={() => router.push('/auctions')}>
                Ver leilões
              </button>
              <button type="button" className="secondary" onClick={resetImport}>
                Importar outra planilha
              </button>
            </div>
          </div>
        ) : (
          <>
            {(phase === 'idle' || phase === 'parsing') && (
              <AuctionImportUpload onFile={handleParse} disabled={busy} />
            )}

            {phase === 'parsing' && (
              <p className="auction-import-status">Processando planilha…</p>
            )}

            {(phase === 'preview' || phase === 'committing') && rows.length > 0 && (
              <>
                <div className="auction-import-meta card">
                  <p>
                    Arquivo: <strong>{fileName}</strong>
                  </p>
                  <p>
                    Revise as categorias de animais e demais campos antes de
                    confirmar.
                  </p>
                </div>

                <AuctionImportPreviewTable
                  rows={rows}
                  defaultYear={defaultYear}
                  onChange={setRows}
                />

                <div className="auction-import-actions">
                  <button
                    type="button"
                    disabled={busy || selectedCount === 0}
                    onClick={() => void handleCommit()}
                  >
                    {phase === 'committing'
                      ? 'Importando…'
                      : `Importar ${selectedCount} leilão${selectedCount === 1 ? '' : 'ões'}`}
                  </button>
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={resetImport}
                  >
                    Trocar arquivo
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
