'use client';

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import type { ClientAnalyticsOverview } from '@/types/client-analytics';

const COLORS = ['var(--accent)', 'var(--muted)'];

interface Props {
  data: ClientAnalyticsOverview['tags'];
}

export function TagsSection({ data }: Props) {
  const chartData = [
    { name: 'Com etiqueta', value: data.comEtiqueta },
    { name: 'Sem etiqueta', value: data.semEtiqueta },
  ].filter((entry) => entry.value > 0);

  const total = data.comEtiqueta + data.semEtiqueta;
  const pct =
    total > 0 ? Math.round((data.comEtiqueta / total) * 100) : 0;

  return (
    <section className="card dashboard-section">
      <h2 className="dashboard-section-title">Etiquetas</h2>
      <p className="dashboard-section-desc">
        Clientes com classificação (tipo, categoria ou intenção) vs sem etiqueta.
      </p>

      {total === 0 ? (
        <p className="dashboard-empty">Nenhum cliente cadastrado.</p>
      ) : (
        <>
          <div className="dashboard-chart-wrap dashboard-chart-wrap--donut">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {chartData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    color: 'var(--text)',
                  }}
                />
                <Legend
                  wrapperStyle={{ color: 'var(--muted)', fontSize: 13 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <p className="dashboard-tags-summary">
            <strong>{pct}%</strong> dos clientes possuem etiqueta (
            {data.comEtiqueta} de {total})
          </p>
        </>
      )}
    </section>
  );
}
