'use client';

import type { ImportProgressState } from '@/types/client-import';

interface Props {
  progress: ImportProgressState | null;
  onCancel?: () => void;
}

export function ImportProgressBar({ progress, onCancel }: Props) {
  if (!progress || progress.phase === 'idle') return null;

  const percent =
    progress.indeterminate || progress.total <= 0
      ? null
      : Math.min(100, Math.round((progress.current / progress.total) * 100));

  return (
    <div
      className="import-progress-panel card"
      role="region"
      aria-label={progress.label}
    >
      <div className="import-progress-header">
        <strong>{progress.label}</strong>
        {percent !== null && (
          <span className="import-progress-percent">{percent}%</span>
        )}
      </div>
      <div
        className={`import-progress-track${progress.indeterminate ? ' indeterminate' : ''}`}
        role="progressbar"
        aria-valuenow={percent ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={progress.label}
      >
        <div
          className="import-progress-fill"
          style={
            percent !== null ? { width: `${percent}%` } : undefined
          }
        />
      </div>
      {progress.phase === 'committing' && progress.total > 0 && (
        <p className="import-progress-detail">
          {progress.current} de {progress.total} linha(s)
          {(progress.importedCount !== undefined ||
            progress.updatedCount !== undefined) && (
            <>
              {' '}
              · {progress.importedCount ?? 0} criado(s) ·{' '}
              {progress.updatedCount ?? 0} atualizado(s) ·{' '}
              {progress.skippedCount ?? 0} ignorado(s)
            </>
          )}
        </p>
      )}
      {progress.phase === 'committing' && onCancel && (
        <button
          type="button"
          className="ghost import-progress-cancel"
          onClick={onCancel}
        >
          Cancelar importação
        </button>
      )}
    </div>
  );
}
