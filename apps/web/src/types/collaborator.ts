export interface Team {
  id: string;
  name: string;
  description: string | null;
  collaboratorCount?: number;
}

export interface Collaborator {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  active: boolean;
  teamId: string;
  team: { id: string; name: string } | null;
}
