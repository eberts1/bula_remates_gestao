'use client';

interface Props {
  columnMapping: Record<string, number | undefined>;
}

const LABELS: Record<string, string> = {
  name: 'Nome',
  farmName: 'Fazenda',
  city: 'Cidade',
  state: 'UF',
  phone: 'Telefone',
  phone2: 'Telefone 2',
  document: 'Documento',
  email: 'E-mail',
  notes: 'Observações',
};

export function ImportColumnMappingInfo({ columnMapping }: Props) {
  const entries = Object.entries(columnMapping).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return null;

  return (
    <div className="card" style={{ marginTop: '1rem', fontSize: '0.875rem' }}>
      <strong>Mapeamento de colunas detectado</strong>
      <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', color: 'var(--muted)' }}>
        {entries.map(([key, col]) => (
          <li key={key}>
            {LABELS[key] ?? key}: coluna {(col ?? 0) + 1}
          </li>
        ))}
      </ul>
      <p style={{ marginTop: '0.5rem', color: 'var(--muted)', fontSize: '0.8rem' }}>
        Se alguma coluna estiver errada, ajuste os dados no drawer linha a linha antes de
        importar.
      </p>
    </div>
  );
}
