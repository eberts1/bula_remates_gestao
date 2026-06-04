'use client';

import type { ImportRow } from '@/types/client-import';

interface Props {
  rows: ImportRow[];
  onApplyToConflicts: (resolution: 'update' | 'skip' | 'create') => void;
}

export function ImportConflictsPanel({ rows, onApplyToConflicts }: Props) {
  const conflicts = rows.filter((r) => r.conflict);
  if (conflicts.length === 0) return null;

  const byReason = conflicts.reduce<Record<string, number>>((acc, r) => {
    const key = r.conflict!.matchReason;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const reasonLabels: Record<string, string> = {
    legacy_code: 'código legado',
    document: 'documento',
    email: 'e-mail',
    phone: 'telefone',
    name_city: 'nome e cidade',
  };

  return (
    <div className="import-conflicts-panel card">
      <strong>{conflicts.length} possível(is) duplicata(s)</strong>
      <p style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: '0.35rem' }}>
        {Object.entries(byReason)
          .map(([k, n]) => `${n} por ${reasonLabels[k] ?? k}`)
          .join(' · ')}
      </p>
      <div className="import-conflicts-actions">
        <button
          type="button"
          className="ghost"
          style={{ fontSize: '0.8rem' }}
          onClick={() => onApplyToConflicts('update')}
        >
          Atualizar todos os conflitos
        </button>
        <button
          type="button"
          className="ghost"
          style={{ fontSize: '0.8rem' }}
          onClick={() => onApplyToConflicts('skip')}
        >
          Ignorar todos
        </button>
      </div>
    </div>
  );
}
