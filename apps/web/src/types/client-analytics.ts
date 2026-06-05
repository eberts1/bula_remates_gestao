export interface ClientAnalyticsOverview {
  totals: {
    total: number;
    active: number;
    inactive: number;
  };
  byRegion: {
    byState: { state: string; clients: number }[];
    topCities: { city: string; state: string; clients: number }[];
    byDddRegion: { region: string; uf: string; clients: number }[];
    semRegiao: number;
  };
  farms: {
    total: number;
    comLocalizacao: number;
    semLocalizacao: number;
  };
  tags: {
    comEtiqueta: number;
    semEtiqueta: number;
  };
  byCollaborator: {
    items: { collaboratorId: string; name: string; clients: number }[];
    semResponsavel: number;
  };
}
