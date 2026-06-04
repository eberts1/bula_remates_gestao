'use client';

const LABELS: Record<string, string> = {
  etb_estancia_bahia: 'Lista ETB — Estância Bahia',
  touro_mt_list: 'Lista leilão (Touro MT)',
  spreadsheet: 'Planilha Excel',
};

interface Props {
  sourceType: string;
  sourceLabel?: string;
  fileName?: string;
  rowCount?: number;
}

export function ImportSourceBadge({
  sourceType,
  sourceLabel,
  fileName,
  rowCount,
}: Props) {
  const label = sourceLabel ?? LABELS[sourceType] ?? sourceType;

  return (
    <div className="import-source-badge card">
      <span className="import-source-type">{label}</span>
      {fileName && (
        <span className="import-source-file">
          {fileName}
          {rowCount !== undefined ? ` — ${rowCount} linha(s)` : ''}
        </span>
      )}
    </div>
  );
}
