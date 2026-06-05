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

const COLORS = ['var(--success)', 'var(--danger)'];

interface Props {
  data: ClientAnalyticsOverview['farms'];
}

export function FarmsSection({ data }: Props) {
  const chartData = [
    { name: 'Com localização', value: data.comLocalizacao },
    { name: 'Sem localização', value: data.semLocalizacao },
  ].filter((entry) => entry.value > 0);

  return (
    <section className="card dashboard-section">
      <h2 className="dashboard-section-title">Fazendas</h2>
      <p className="dashboard-section-desc">
        Fazendas com cidade/UF válida vs sem localização preenchida.
      </p>

      {data.total === 0 ? (
        <p className="dashboard-empty">Nenhuma fazenda cadastrada.</p>
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

          <div className="dashboard-farm-stats">
            <div>
              <span className="dashboard-farm-stat-value">{data.total}</span>
              <span className="dashboard-farm-stat-label">Total</span>
            </div>
            <div>
              <span className="dashboard-farm-stat-value">{data.comLocalizacao}</span>
              <span className="dashboard-farm-stat-label">Com localização</span>
            </div>
            <div>
              <span className="dashboard-farm-stat-value">{data.semLocalizacao}</span>
              <span className="dashboard-farm-stat-label">Sem localização</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
