'use client';

import { useCallback, useEffect, useState } from 'react';
import { AppShell } from '@/components/AppShell';
import { CollaboratorForm } from '@/components/collaborators/CollaboratorForm';
import { CollaboratorGallery } from '@/components/collaborators/CollaboratorGallery';
import { CollaboratorSearch } from '@/components/collaborators/CollaboratorSearch';
import { TeamForm } from '@/components/collaborators/TeamForm';
import { TeamList } from '@/components/collaborators/TeamList';
import type { Collaborator, Team } from '@/types/collaborator';

export default function CollaboratorsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedTeamForm, setSelectedTeamForm] = useState<Team | null>(null);
  const [selectedCollab, setSelectedCollab] = useState<Collaborator | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [collabLoading, setCollabLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadTeams = useCallback(async () => {
    setTeamsLoading(true);
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      if (res.ok) setTeams(data.items ?? []);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  const loadCollaborators = useCallback(async () => {
    setCollabLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (selectedTeam) params.set('teamId', selectedTeam.id);
      const res = await fetch(`/api/collaborators?${params}`);
      const data = await res.json();
      if (res.ok) setCollaborators(data.items ?? []);
    } finally {
      setCollabLoading(false);
    }
  }, [debouncedSearch, selectedTeam]);

  useEffect(() => {
    void loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    void loadCollaborators();
  }, [loadCollaborators]);

  function handleTeamsSaved() {
    void loadTeams();
    setSelectedTeamForm(null);
  }

  function handleCollabSaved() {
    void loadCollaborators();
    void loadTeams();
    setSelectedCollab(null);
  }

  return (
    <AppShell title="Colaboradores">
      <div className="two-col-layout">
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TeamForm
            team={selectedTeamForm}
            onSaved={handleTeamsSaved}
            onClear={() => setSelectedTeamForm(null)}
          />
          <div className="card">
            <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>Equipes</h2>
            <TeamList
              teams={teams}
              selectedId={selectedTeam?.id ?? null}
              onSelect={(team) => {
                setSelectedTeam(team);
                if (team) setSelectedTeamForm(team);
              }}
              loading={teamsLoading}
            />
          </div>
        </aside>

        <div>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <CollaboratorSearch value={search} onChange={setSearch} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(260px, 300px) 1fr',
              gap: '1.5rem',
              alignItems: 'start',
            }}
          >
            <CollaboratorForm
              collaborator={selectedCollab}
              teams={teams}
              defaultTeamId={selectedTeam?.id ?? null}
              onSaved={handleCollabSaved}
              onClear={() => setSelectedCollab(null)}
            />
            <div>
              <h2 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--muted)' }}>
                Colaboradores
                {selectedTeam ? ` · ${selectedTeam.name}` : ''}
              </h2>
              <CollaboratorGallery
                collaborators={collaborators}
                selectedId={selectedCollab?.id ?? null}
                onSelect={setSelectedCollab}
                loading={collabLoading}
              />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
