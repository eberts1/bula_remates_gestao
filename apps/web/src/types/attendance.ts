export interface AttendanceActivityType {
  type: string;
  label: string;
}

export interface AttendanceActionClient {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  animalType: string | null;
  animalSex: string | null;
  livestockCategory: string | null;
  responsible: { id: string; name: string } | null;
  intentions: Array<{ id: string; code: string; label: string }>;
}

export interface AttendanceActionAuction {
  id: string;
  name: string;
  scheduledAt: string | null;
  status: string;
}

export interface AttendanceActionCard {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  status: string;
  sortOrder: number;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  client: AttendanceActionClient;
  auction: AttendanceActionAuction | null;
  taskProgress: { done: number; total: number };
}

export interface AttendanceBoardColumn {
  id: string;
  title: string;
  color: string | null;
  sortOrder: number;
  cards: AttendanceActionCard[];
  total: number;
  hasMore: boolean;
}

export interface AttendanceBoardResponse {
  columns: AttendanceBoardColumn[];
  activityTypes: AttendanceActivityType[];
}

export interface AttendanceActionTask {
  id: string;
  actionId: string;
  title: string;
  done: boolean;
  sortOrder: number;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceActivity {
  id: string;
  actionId: string;
  type: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string } | null;
}

export interface AttendanceActionDetail extends AttendanceActionCard {
  tasks: AttendanceActionTask[];
  activities: AttendanceActivity[];
}

export interface AttendanceFilters {
  q: string;
  auctionId: string;
}

export function emptyAttendanceFilters(): AttendanceFilters {
  return {
    q: '',
    auctionId: '',
  };
}
