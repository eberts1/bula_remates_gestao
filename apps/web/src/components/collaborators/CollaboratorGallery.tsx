'use client';

import type { Collaborator } from '@/types/collaborator';

interface Props {
  collaborators: Collaborator[];
  selectedId: string | null;
  onSelect: (c: Collaborator) => void;
  loading: boolean;
}

export function CollaboratorGallery({
  collaborators,
  selectedId,
  onSelect,
  loading,
}: Props) {
  if (loading) {
    return <p style={{ color: 'var(--muted)' }}>Carregando colaboradores...</p>;
  }

  if (collaborators.length === 0) {
    return (
      <p className="card" style={{ color: 'var(--muted)', padding: '2rem', textAlign: 'center' }}>
        Nenhum colaborador encontrado.
      </p>
    );
  }

  return (
    <div className="gallery-grid">
      {collaborators.map((c) => (
        <article
          key={c.id}
          className={`gallery-card ${selectedId === c.id ? 'selected' : ''}`}
          onClick={() => onSelect(c)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onSelect(c);
          }}
          role="button"
          tabIndex={0}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={{ fontSize: '1rem' }}>{c.name}</h3>
            <span className={`badge ${c.active ? 'badge-active' : 'badge-inactive'}`}>
              {c.active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
          {c.role && <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{c.role}</p>}
          {c.team && (
            <p style={{ fontSize: '0.8rem', marginTop: '0.35rem' }}>{c.team.name}</p>
          )}
          {c.email && (
            <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: '0.35rem' }}>
              {c.email}
            </p>
          )}
        </article>
      ))}
    </div>
  );
}
