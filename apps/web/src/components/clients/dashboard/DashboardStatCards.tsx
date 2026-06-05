'use client';

import type { ClientAnalyticsOverview } from '@/types/client-analytics';

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card dashboard-stat-card">
      <p className="dashboard-stat-value">{value.toLocaleString('pt-BR')}</p>
      <p className="dashboard-stat-label">{label}</p>
    </div>
  );
}

interface Props {
  data: ClientAnalyticsOverview;
}

export function DashboardStatCards({ data }: Props) {
  return (
    <div className="dashboard-stat-grid">
      <StatCard label="Total de clientes" value={data.totals.total} />
      <StatCard label="Clientes ativos" value={data.totals.active} />
      <StatCard label="Fazendas cadastradas" value={data.farms.total} />
      <StatCard label="Com etiqueta" value={data.tags.comEtiqueta} />
    </div>
  );
}
