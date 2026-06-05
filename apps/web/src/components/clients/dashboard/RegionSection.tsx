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
  data: ClientAnalyticsOverview['byRegion'];
}

export function RegionSection({ data }: Props) {
  const chartData = data.byState.slice(0, 12);

  return (
    <section className="card dashboard-section">
      <h2 className="dashboard-section-title">Por região</h2>
      <p className="dashboard-section-desc">
        Distribuição de clientes por UF e principais cidades.
      </p>

      {chartData.length === 0 ? (
        <p className="dashboard-empty">Nenhum cliente com fazenda cadastrada.</p>
      ) : (
        <div className="dashboard-chart-wrap">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="state"
                tick={{ fill: 'var(--muted)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--border)' }}
                tickLine={{ stroke: 'var(--border)' }}
              />
              <YAxis
                allowDecimals={false}
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
              <Bar dataKey="clients" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="dashboard-region-meta">
        {data.semRegiao > 0 && (
          <p className="dashboard-meta-chip">
            {data.semRegiao} cliente{data.semRegiao !== 1 ? 's' : ''} sem região
          </p>
        )}
      </div>

      {data.topCities.length > 0 && (
        <div className="dashboard-top-cities">
          <h3 className="dashboard-subtitle">Top cidades</h3>
          <ul className="dashboard-city-list">
            {data.topCities.map((entry) => (
              <li key={`${entry.city}-${entry.state}`}>
                <span>
                  {entry.city}/{entry.state}
                </span>
                <strong>{entry.clients}</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
