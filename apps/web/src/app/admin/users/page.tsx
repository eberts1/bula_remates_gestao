'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import type {
  AdminTenant,
  AdminUser,
  AdminUserCollaborator,
  PaginatedResponse,
  TenantRole,
} from '@/types/admin';

const ROLES: TenantRole[] = ['owner', 'admin', 'member', 'viewer'];

interface CollabOption {
  id: string;
  name: string;
  email: string | null;
  userId: string | null;
  team: { id: string; name: string };
}

interface FormState {
  email: string;
  name: string;
  password: string;
  tenantId: string;
  role: TenantRole;
  collaboratorId: string;
  isSuperAdmin: boolean;
  active: boolean;
}

const emptyForm = (): FormState => ({
  email: '',
  name: '',
  password: '',
  tenantId: '',
  role: 'member',
  collaboratorId: '',
  isSuperAdmin: false,
  active: true,
});

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [collaborators, setCollaborators] = useState<CollabOption[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (debouncedQ) params.set('q', debouncedQ);
      const res = await fetch(`/api/admin/users?${params}`);
      const data = (await res.json()) as PaginatedResponse<AdminUser>;
      if (res.ok) setUsers(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [debouncedQ]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    fetch('/api/admin/tenants')
      .then((r) => r.json())
      .then((d) => setTenants(d.items ?? []));
  }, []);

  useEffect(() => {
    if (!form.tenantId) {
      setCollaborators([]);
      return;
    }
    fetch(`/api/admin/collaborators?tenantId=${form.tenantId}`)
      .then((r) => r.json())
      .then((d) => setCollaborators(d.items ?? []));
  }, [form.tenantId]);

  function selectUser(user: AdminUser | null) {
    setSelected(user);
    setError(null);
    if (!user) {
      setForm(emptyForm());
      return;
    }
    const membership = user.memberships[0];
    const collab = user.collaborators[0];
    setForm({
      email: user.email,
      name: user.name,
      password: '',
      tenantId: membership?.tenantId ?? '',
      role: membership?.role ?? 'member',
      collaboratorId: collab?.id ?? '',
      isSuperAdmin: user.isSuperAdmin,
      active: user.active,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (selected) {
        const body: Record<string, unknown> = {
          name: form.name,
          tenantId: form.tenantId,
          role: form.role,
          isSuperAdmin: form.isSuperAdmin,
          active: form.active,
          collaboratorId: form.collaboratorId || null,
        };
        if (form.password) body.password = form.password;

        const res = await fetch(`/api/admin/users/${selected.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Erro ao salvar');
      } else {
        if (!form.password || form.password.length < 8) {
          throw new Error('Senha deve ter no mínimo 8 caracteres');
        }
        const body = {
          email: form.email,
          name: form.name,
          password: form.password,
          tenantId: form.tenantId,
          role: form.role,
          isSuperAdmin: form.isSuperAdmin,
          collaboratorId: form.collaboratorId || undefined,
        };
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? 'Erro ao criar');
      }
      selectUser(null);
      void loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!selected || !confirm(`Desativar usuário ${selected.email}?`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/users/${selected.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message ?? 'Erro');
      }
      selectUser(null);
      void loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro');
    } finally {
      setSaving(false);
    }
  }

  function collabLabel(c: AdminUserCollaborator) {
    return `${c.name} (${c.team.name})`;
  }

  return (
    <AdminShell title="Usuários da plataforma">
      <div style={{ marginBottom: '1rem' }}>
        <input
          placeholder="Buscar por nome ou e-mail…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 320px) 1fr',
          gap: '1.5rem',
          alignItems: 'start',
        }}
      >
        <form className="card" onSubmit={handleSubmit} style={{ padding: '1.25rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>
            {selected ? 'Editar usuário' : 'Novo usuário'}
          </h2>

          {!selected && (
            <label style={{ marginBottom: '0.75rem' }}>
              E-mail
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
          )}

          <label style={{ marginBottom: '0.75rem' }}>
            Nome
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>

          <label style={{ marginBottom: '0.75rem' }}>
            {selected ? 'Nova senha (opcional)' : 'Senha'}
            <input
              type="password"
              required={!selected}
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            />
          </label>

          <label style={{ marginBottom: '0.75rem' }}>
            Empresa
            <select
              required
              value={form.tenantId}
              onChange={(e) =>
                setForm((f) => ({ ...f, tenantId: e.target.value, collaboratorId: '' }))
              }
              style={{
                background: 'var(--bg)',
                color: 'var(--text)',
                padding: '0.65rem 0.85rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                width: '100%',
              }}
            >
              <option value="">Selecione…</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ marginBottom: '0.75rem' }}>
            Papel
            <select
              value={form.role}
              onChange={(e) =>
                setForm((f) => ({ ...f, role: e.target.value as TenantRole }))
              }
              style={{
                background: 'var(--bg)',
                color: 'var(--text)',
                padding: '0.65rem 0.85rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                width: '100%',
              }}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label style={{ marginBottom: '0.75rem' }}>
            Colaborador vinculado
            <select
              value={form.collaboratorId}
              onChange={(e) => setForm((f) => ({ ...f, collaboratorId: e.target.value }))}
              disabled={!form.tenantId}
              style={{
                background: 'var(--bg)',
                color: 'var(--text)',
                padding: '0.65rem 0.85rem',
                borderRadius: 8,
                border: '1px solid var(--border)',
                width: '100%',
              }}
            >
              <option value="">Nenhum</option>
              {collaborators
                .filter((c) => !c.userId || c.userId === selected?.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.team.name})
                  </option>
                ))}
            </select>
          </label>

          <label
            style={{
              marginBottom: '0.75rem',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <input
              type="checkbox"
              checked={form.isSuperAdmin}
              onChange={(e) => setForm((f) => ({ ...f, isSuperAdmin: e.target.checked }))}
            />
            Super-admin
          </label>

          {selected && (
            <label
              style={{
                marginBottom: '0.75rem',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              />
              Ativo
            </label>
          )}

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="submit" disabled={saving}>
              {saving ? 'Salvando…' : selected ? 'Salvar' : 'Criar'}
            </button>
            {selected && (
              <>
                <button type="button" className="ghost" onClick={() => selectUser(null)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="ghost"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => void handleDeactivate()}
                  disabled={saving}
                >
                  Desativar
                </button>
              </>
            )}
          </div>
        </form>

        <div className="card" style={{ overflow: 'auto' }}>
          {loading ? (
            <p style={{ padding: '1.5rem', color: 'var(--muted)' }}>Carregando…</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Nome</th>
                  <th style={{ padding: '0.75rem' }}>E-mail</th>
                  <th style={{ padding: '0.75rem' }}>Empresa</th>
                  <th style={{ padding: '0.75rem' }}>Papel</th>
                  <th style={{ padding: '0.75rem' }}>Colaborador</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => selectUser(user)}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background:
                        selected?.id === user.id ? 'rgba(59, 130, 246, 0.08)' : undefined,
                    }}
                  >
                    <td style={{ padding: '0.75rem' }}>
                      {user.name}
                      {user.isSuperAdmin && (
                        <span
                          style={{
                            marginLeft: '0.35rem',
                            fontSize: '0.7rem',
                            color: 'var(--accent)',
                          }}
                        >
                          SA
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--muted)' }}>{user.email}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--muted)' }}>
                      {user.memberships[0]?.tenantName ?? '—'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{user.memberships[0]?.role ?? '—'}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--muted)' }}>
                      {user.collaborators[0] ? collabLabel(user.collaborators[0]) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: 4,
                          background: user.active
                            ? 'var(--badge-active-bg)'
                            : 'var(--badge-inactive-bg)',
                          color: user.active ? 'var(--success)' : 'var(--muted)',
                        }}
                      >
                        {user.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)' }}
                    >
                      Nenhum usuário encontrado.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
