'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { ClientAnalyticsOverview } from '@/types/client-analytics';

interface Props {
  data: ClientAnalyticsOverview['byCollaborator'];
}

export function CollaboratorSection({ data }: Props) {
  const chartData = [
    ...data.items.map((item) => ({
      name: item.name,
      clients: item.clients,
    })),
    ...(data.semResponsavel > 0
      ? [{ name: 'Sem responsável', clients: data.semResponsavel }]
      : []),
  ].slice(0, 15);

  return (
    <section className="card dashboard-section dashboard-section--wide">
      <h2 className="dashboard-section-title">Por colaborador</h2>
      <p className="dashboard-section-desc">
        Clientes atribuídos a cada colaborador responsável.
      </p>

      {chartData.length === 0 ? (
        <p className="dashboard-empty">Nenhum cliente cadastrado.</p>
      ) : (
        <div className="dashboard-chart-wrap dashboard-chart-wrap--tall">
          <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 36)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={{ stroke: 'var(--border)' }}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={{ stroke: 'var(--border)' }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  color: 'var(--text)',
                }}
                formatter={(value) => [value, 'Clientes']}
              />
              <Bar dataKey="clients" fill="var(--accent)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
