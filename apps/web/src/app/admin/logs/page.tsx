'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import type { AdminTenant, AuditLogEntry, PaginatedResponse } from '@/types/admin';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [tenants, setTenants] = useState<AdminTenant[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    fetch('/api/admin/tenants')
      .then((r) => r.json())
      .then((d) => setTenants(d.items ?? []));
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' });
      if (debouncedQ) params.set('q', debouncedQ);
      if (action) params.set('action', action);
      if (tenantId) params.set('tenantId', tenantId);
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = (await res.json()) as PaginatedResponse<AuditLogEntry>;
      if (res.ok) {
        setLogs(data.items ?? []);
        setTotal(data.total ?? 0);
      }
    } finally {
      setLoading(false);
    }
  }, [page, debouncedQ, action, tenantId]);

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  const totalPages = Math.max(1, Math.ceil(total / 30));

  return (
    <AdminShell title="Registro de logs">
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
        }}
      >
        <input
          placeholder="Buscar por resumo, e-mail ou ação…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
          style={{ flex: '1 1 220px', maxWidth: 360 }}
        />
        <input
          placeholder="Filtrar ação (ex: client_import)"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          style={{ flex: '0 1 200px' }}
        />
        <select
          value={tenantId}
          onChange={(e) => {
            setTenantId(e.target.value);
            setPage(1);
          }}
          style={{
            flex: '0 1 200px',
            background: 'var(--bg)',
            color: 'var(--text)',
            padding: '0.65rem 0.85rem',
            borderRadius: 8,
            border: '1px solid var(--border)',
          }}
        >
          <option value="">Todas as empresas</option>
          {tenants.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="card" style={{ overflow: 'auto' }}>
        {loading ? (
          <p style={{ padding: '1.5rem', color: 'var(--muted)' }}>Carregando…</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '0.75rem' }}>Data</th>
                <th style={{ padding: '0.75rem' }}>Ação</th>
                <th style={{ padding: '0.75rem' }}>Resumo</th>
                <th style={{ padding: '0.75rem' }}>Empresa</th>
                <th style={{ padding: '0.75rem' }}>Usuário</th>
                <th style={{ padding: '0.75rem' }}>IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.75rem', whiteSpace: 'nowrap', color: 'var(--muted)' }}>
                    {formatDate(log.createdAt)}
                  </td>
                  <td style={{ padding: '0.75rem' }}>
                    <code style={{ fontSize: '0.8rem' }}>{log.action}</code>
                  </td>
                  <td style={{ padding: '0.75rem', maxWidth: 320 }}>{log.summary ?? '—'}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--muted)' }}>
                    {log.tenant?.name ?? '—'}
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--muted)' }}>
                    {log.user?.email ?? log.actorEmail ?? '—'}
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {log.ip ?? '—'}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)' }}>
                    Nenhum log encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', alignItems: 'center' }}>
          <button className="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Anterior
          </button>
          <span style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>
            Página {page} de {totalPages} ({total} registros)
          </span>
          <button
            className="ghost"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Próxima
          </button>
        </div>
      )}
    </AdminShell>
  );
}
