'use client';

import type { Team } from '@/types/collaborator';

interface Props {
  teams: Team[];
  selectedId: string | null;
  onSelect: (team: Team | null) => void;
  loading: boolean;
}

export function TeamList({ teams, selectedId, onSelect, loading }: Props) {
  if (loading) {
    return <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Carregando equipes...</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <button
        type="button"
        className={`ghost ${selectedId === null ? 'team-selected' : ''}`}
        style={{ textAlign: 'left', width: '100%' }}
        onClick={() => onSelect(null)}
      >
        Todas as equipes
      </button>
      {teams.map((team) => (
        <button
          key={team.id}
          type="button"
          className={`ghost ${selectedId === team.id ? 'team-selected' : ''}`}
          style={{ textAlign: 'left', width: '100%' }}
          onClick={() => onSelect(team)}
        >
          {team.name}
          {team.collaboratorCount !== undefined && (
            <span style={{ color: 'var(--muted)', marginLeft: 6, fontSize: '0.8rem' }}>
              ({team.collaboratorCount})
            </span>
          )}
        </button>
      ))}
      {teams.length === 0 && (
        <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Nenhuma equipe cadastrada.</p>
      )}
    </div>
  );
}
