'use client';

import { useEffect, useState } from 'react';

import { AppShell } from '@/components/AppShell';
import { CollaboratorSection } from '@/components/clients/dashboard/CollaboratorSection';
import { DashboardStatCards } from '@/components/clients/dashboard/DashboardStatCards';
import { FarmsSection } from '@/components/clients/dashboard/FarmsSection';
import { RegionSection } from '@/components/clients/dashboard/RegionSection';
import { TagsSection } from '@/components/clients/dashboard/TagsSection';
import type { ClientAnalyticsOverview } from '@/types/client-analytics';

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      <div className="dashboard-stat-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card dashboard-stat-card">
            <div className="skeleton-line" style={{ height: '2rem', width: '60%', marginBottom: '0.5rem' }} />
            <div className="skeleton-line" style={{ height: '0.875rem', width: '80%' }} />
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card dashboard-section">
            <div className="skeleton-line" style={{ height: '1.25rem', width: '40%', marginBottom: '1rem' }} />
            <div className="skeleton-line" style={{ height: '200px', width: '100%' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClientDashboardPage() {
  const [data, setData] = useState<ClientAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/client-analytics/overview')
      .then((r) => {
        if (!r.ok) throw new Error('Falha ao carregar dashboard');
        return r.json();
      })
      .then((d: ClientAnalyticsOverview) => setData(d))
      .catch((e) => setError(e instanceof Error ? e.message : 'Erro'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell title="Dashboard de clientes">
      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <p className="error">{error}</p>
      ) : data ? (
        <>
          <DashboardStatCards data={data} />

          <div className="dashboard-grid">
            <RegionSection data={data.byRegion} />
            <FarmsSection data={data.farms} />
            <TagsSection data={data.tags} />
          </div>

          <CollaboratorSection data={data.byCollaborator} />
        </>
      ) : null}
    </AppShell>
  );
}
