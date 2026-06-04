'use client';

import { useEffect, useState } from 'react';
import type { Collaborator, Team } from '@/types/collaborator';

interface Props {
  collaborator: Collaborator | null;
  teams: Team[];
  defaultTeamId: string | null;
  onSaved: () => void;
  onClear: () => void;
}

export function CollaboratorForm({
  collaborator,
  teams,
  defaultTeamId,
  onSaved,
  onClear,
}: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');
  const [teamId, setTeamId] = useState('');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (collaborator) {
      setName(collaborator.name);
      setEmail(collaborator.email ?? '');
      setPhone(collaborator.phone ?? '');
      setRole(collaborator.role ?? '');
      setTeamId(collaborator.teamId);
      setActive(collaborator.active);
    } else {
      setName('');
      setEmail('');
      setPhone('');
      setRole('');
      setTeamId(defaultTeamId ?? teams[0]?.id ?? '');
      setActive(true);
    }
    setError('');
  }, [collaborator, defaultTeamId, teams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) {
      setError('Selecione uma equipe');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const body = {
        name,
        email: email || undefined,
        phone: phone || undefined,
        role: role || undefined,
        teamId,
        active,
      };
      const url = collaborator ? `/api/collaborators/${collaborator.id}` : '/api/collaborators';
      const method = collaborator ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro ao salvar');
      onSaved();
      if (!collaborator) {
        setName('');
        setEmail('');
        setPhone('');
        setRole('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!collaborator) return;
    if (!confirm('Excluir este colaborador?')) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/collaborators/${collaborator.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? 'Erro');
      onClear();
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setLoading(false);
    }
  }

  if (teams.length === 0) {
    return (
      <div className="card">
        <p style={{ color: 'var(--muted)' }}>Cadastre uma equipe antes de adicionar colaboradores.</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
        {collaborator ? 'Editar colaborador' : 'Novo colaborador'}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <label>
          Nome *
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Telefone
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </label>
        <label>
          Cargo / função
          <input value={role} onChange={(e) => setRole(e.target.value)} />
        </label>
        <label>
          Equipe *
          <select
            required
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            style={{
              background: 'var(--bg)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '0.65rem 0.85rem',
              width: '100%',
            }}
          >
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            style={{ width: 'auto' }}
          />
          Colaborador ativo
        </label>
      </div>
      {error && <p className="error">{error}</p>}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        <button type="submit" className="primary" disabled={loading}>
          {loading ? 'Salvando...' : 'Salvar'}
        </button>
        <button type="button" className="ghost" onClick={onClear}>
          Novo
        </button>
        {collaborator && (
          <button type="button" className="ghost" onClick={handleDelete} disabled={loading}>
            Excluir
          </button>
        )}
      </div>
    </form>
  );
}
