'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AdminShell } from '@/components/admin/AdminShell';
import type { AdminOverview, AuditLogEntry } from '@/types/admin';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR');
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
      <p style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{value}</p>
      <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>{label}</p>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/overview')
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell title="Painel Admin">
      {loading ? (
        <p style={{ color: 'var(--muted)' }}>Carregando…</p>
      ) : data ? (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem',
            }}
          >
            <StatCard label="Empresas" value={data.totals.tenants} />
            <StatCard label="Usuários" value={data.totals.users} />
            <StatCard label="Clientes" value={data.totals.clients} />
            <StatCard label="Importações" value={data.totals.imports} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.125rem' }}>Atividade recente</h2>
            <Link href="/admin/logs">Ver todos os logs →</Link>
          </div>

          <div className="card" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '0.75rem' }}>Data</th>
                  <th style={{ padding: '0.75rem' }}>Ação</th>
                  <th style={{ padding: '0.75rem' }}>Resumo</th>
                  <th style={{ padding: '0.75rem' }}>Empresa</th>
                  <th style={{ padding: '0.75rem' }}>Usuário</th>
                </tr>
              </thead>
              <tbody>
                {data.recentLogs.map((log: AuditLogEntry) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.75rem', whiteSpace: 'nowrap', color: 'var(--muted)' }}>
                      {formatDate(log.createdAt)}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <code style={{ fontSize: '0.8rem' }}>{log.action}</code>
                    </td>
                    <td style={{ padding: '0.75rem' }}>{log.summary ?? '—'}</td>
                    <td style={{ padding: '0.75rem', color: 'var(--muted)' }}>
                      {log.tenant?.name ?? '—'}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--muted)' }}>
                      {log.user?.email ?? log.actorEmail ?? '—'}
                    </td>
                  </tr>
                ))}
                {data.recentLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--muted)' }}>
                      Nenhum log registrado ainda.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--danger)' }}>Erro ao carregar dados.</p>
      )}
    </AdminShell>
  );
}
