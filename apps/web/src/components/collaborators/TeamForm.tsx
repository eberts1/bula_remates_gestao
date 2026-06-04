'use client';

import { useEffect, useState } from 'react';
import type { Team } from '@/types/collaborator';

interface Props {
  team: Team | null;
  onSaved: () => void;
  onClear: () => void;
}

export function TeamForm({ team, onSaved, onClear }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (team) {
      setName(team.name);
      setDescription(team.description ?? '');
    } else {
      setName('');
      setDescription('');
    }
    setError('');
  }, [team]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const url = team ? `/api/teams/${team.id}` : '/api/teams';
      const method = team ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: description || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao salvar');
      onSaved();
      if (!team) {
        setName('');
        setDescription('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!team) return;
    if (!confirm('Excluir esta equipe?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/teams/${team.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao excluir');
      onClear();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>Equipe</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <label>
          Nome *
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Descrição
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar equipe'}
        </button>
        <button type="button" className="ghost" onClick={onClear}>
          Nova
        </button>
        {team && (
          <button type="button" className="ghost" onClick={handleDelete} disabled={loading}>
            Excluir
          </button>
        )}
      </div>
    </form>
  );
}
