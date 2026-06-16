export type ClientsListQueryParams = Record<string, string>;

export const queryKeys = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  tenantIntentions: {
    all: ['tenant-intentions'] as const,
  },
  clients: {
    all: ['clients'] as const,
    list: (params: ClientsListQueryParams) =>
      ['clients', 'list', params] as const,
    detail: (id: string) => ['clients', 'detail', id] as const,
  },
  attendance: {
    all: ['attendance'] as const,
    board: (params: Record<string, string>) =>
      ['attendance', 'board', params] as const,
    action: (id: string) => ['attendance', 'action', id] as const,
  },
  auctions: {
    all: ['auctions'] as const,
    list: () => ['auctions', 'list'] as const,
    schedule: () => ['auctions', 'schedule'] as const,
    detail: (id: string) => ['auctions', 'detail', id] as const,
    matches: (id: string, params: Record<string, string>) =>
      ['auctions', 'matches', id, params] as const,
  },
};
