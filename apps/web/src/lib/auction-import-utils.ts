const DEFAULT_YEAR = 2026;

export function parseTimeValue(timeStr: string): { hours: number; minutes: number } {
  const t = timeStr.trim();
  if (!t) return { hours: 0, minutes: 0 };

  const colonMatch = t.match(/^(\d{1,2}):(\d{2})$/);
  if (colonMatch) {
    return {
      hours: Number.parseInt(colonMatch[1], 10) || 0,
      minutes: Number.parseInt(colonMatch[2], 10) || 0,
    };
  }

  const num = Number.parseInt(t, 10);
  if (!Number.isNaN(num)) {
    return { hours: num, minutes: 0 };
  }

  return { hours: 0, minutes: 0 };
}

export function buildScheduledAt(
  dateStr: string,
  timeStr: string,
  year = DEFAULT_YEAR,
): string | null {
  const match = dateStr.trim().match(/^(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;

  const day = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  if (day < 1 || day > 31 || month < 1 || month > 12) return null;

  const { hours, minutes } = parseTimeValue(timeStr);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}
