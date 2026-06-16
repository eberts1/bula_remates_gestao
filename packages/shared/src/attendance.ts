export const ATTENDANCE_ACTION_STATUS_OPEN = 'open';
export const ATTENDANCE_ACTION_STATUS_DONE = 'done';

export const ATTENDANCE_ACTION_STATUSES = [
  ATTENDANCE_ACTION_STATUS_OPEN,
  ATTENDANCE_ACTION_STATUS_DONE,
] as const;

export type AttendanceActionStatus =
  (typeof ATTENDANCE_ACTION_STATUSES)[number];

export const ATTENDANCE_ACTIVITY_TYPES = [
  { type: 'note', label: 'Nota' },
  { type: 'call', label: 'Ligação' },
  { type: 'whatsapp', label: 'WhatsApp' },
  { type: 'email', label: 'E-mail' },
  { type: 'visit', label: 'Visita' },
] as const;

export type AttendanceActivityType =
  (typeof ATTENDANCE_ACTIVITY_TYPES)[number]['type'];

export const ATTENDANCE_ACTIVITY_TYPE_KEYS = ATTENDANCE_ACTIVITY_TYPES.map(
  (item) => item.type,
) as AttendanceActivityType[];

export const DEFAULT_BOARD_COLUMNS = [
  { title: 'A categorizar', sortOrder: 0 },
  { title: 'Em atendimento', sortOrder: 1 },
  { title: 'Finalizado', sortOrder: 2 },
] as const;

// Legacy constants kept for backward compatibility during migration
export const ATTENDANCE_STAGE_BACKLOG = 'a_categorizar';
export const ATTENDANCE_STAGE_DONE = 'finalizado';
