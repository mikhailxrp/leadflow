const MS_PER_MINUTE = 60_000;

export interface WorkHours {
  start: string;
  end: string;
  days: number[];
}

function toSpecDay(date: Date): number {
  const jsDay = date.getDay();
  return jsDay === 0 ? 7 : jsDay;
}

function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function workWindowForDay(
  day: Date,
  workHours: WorkHours,
): { start: Date; end: Date } | null {
  if (!workHours.days.includes(toSpecDay(day))) {
    return null;
  }

  const dayStart = startOfDay(day);

  return {
    start: new Date(dayStart.getTime() + parseTimeToMinutes(workHours.start) * MS_PER_MINUTE),
    end: new Date(dayStart.getTime() + parseTimeToMinutes(workHours.end) * MS_PER_MINUTE),
  };
}

export function minutesSinceCreated(
  createdAt: Date,
  now: Date,
  workHours: WorkHours | null,
): number {
  if (!workHours) {
    return (now.getTime() - createdAt.getTime()) / MS_PER_MINUTE;
  }

  if (now.getTime() <= createdAt.getTime()) {
    return 0;
  }

  let totalMs = 0;
  const cursor = startOfDay(createdAt);

  while (cursor.getTime() <= now.getTime()) {
    const window = workWindowForDay(cursor, workHours);

    if (window) {
      const overlapStart = Math.max(window.start.getTime(), createdAt.getTime());
      const overlapEnd = Math.min(window.end.getTime(), now.getTime());

      if (overlapEnd > overlapStart) {
        totalMs += overlapEnd - overlapStart;
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  return totalMs / MS_PER_MINUTE;
}
