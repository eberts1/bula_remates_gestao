'use client';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function CollaboratorSearch({ value, onChange }: Props) {
  return (
    <label style={{ flex: 1, minWidth: 200 }}>
      Buscar colaborador
      <input
        type="search"
        placeholder="Nome ou e-mail..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
