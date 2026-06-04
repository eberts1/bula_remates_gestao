export type TenantRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface AdminTenant {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
  memberCount: number;
  clientCount: number;
}

export interface AdminUserMembership {
  tenantId: string;
  tenantName: string;
  tenantSlug: string;
  role: TenantRole;
}

export interface AdminUserCollaborator {
  id: string;
  name: string;
  email: string | null;
  tenantId: string;
  team: { id: string; name: string };
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
  active: boolean;
  createdAt: string;
  memberships: AdminUserMembership[];
  collaborators: AdminUserCollaborator[];
}

export interface AuditLogEntry {
  id: string;
  tenantId: string | null;
  userId: string | null;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  tenant?: { id: string; name: string; slug: string } | null;
  user?: { id: string; email: string; name: string } | null;
}

export interface AdminOverview {
  totals: {
    tenants: number;
    users: number;
    clients: number;
    imports: number;
  };
  recentLogs: AuditLogEntry[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
