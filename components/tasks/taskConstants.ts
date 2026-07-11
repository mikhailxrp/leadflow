import { type TaskStatus } from '@/components/tasks/TaskStatusBadge';
import type { TaskData } from '@/components/tasks/TaskItem';

export const ACTIVE_STATUSES: TaskStatus[] = ['TODO', 'IN_PROGRESS'];
export const INACTIVE_STATUSES: TaskStatus[] = ['DONE', 'CANCELLED'];

/** Цикл по клику на индикатор: TODO → IN_PROGRESS → DONE → IN_PROGRESS → … */
export function getNextStatusOnCircleClick(status: TaskStatus): TaskStatus | null {
  switch (status) {
    case 'TODO':
      return 'IN_PROGRESS';
    case 'IN_PROGRESS':
      return 'DONE';
    case 'DONE':
      return 'IN_PROGRESS';
    case 'CANCELLED':
      return null;
    default:
      return null;
  }
}

export function isTaskEditable(status: TaskStatus): boolean {
  return ACTIVE_STATUSES.includes(status);
}

export function isTaskOverdue(task: Pick<TaskData, 'status' | 'dueDate'>): boolean {
  if (!ACTIVE_STATUSES.includes(task.status)) return false;
  if (!task.dueDate) return false;
  return new Date(task.dueDate).getTime() < Date.now();
}

export function formatDueDateLabel(dueDate: string | null): string {
  if (!dueDate) return '';
  return new Date(dueDate).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCompletedAtLabel(completedAt: string | null): string {
  if (!completedAt) return '';
  return new Date(completedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

/** Порядок как в `GET /api/leads/:id/tasks`: dueDate ASC (null — последними), затем createdAt ASC. */
export function compareActiveTasks(a: TaskData, b: TaskData): number {
  if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;
}

/** Порядок как в `GET /api/leads/:id/tasks`: completedAt DESC. */
export function compareInactiveTasks(a: TaskData, b: TaskData): number {
  const aCompleted = a.completedAt ?? '';
  const bCompleted = b.completedAt ?? '';
  if (aCompleted === bCompleted) return 0;
  return aCompleted > bCompleted ? -1 : 1;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Локальные date/time из нативных инпутов → ISO (строка без смещения парсится JS как local time). */
export function toIsoFromLocalParts(date: string, time: string): string | undefined {
  if (!date) return undefined;
  const parsed = new Date(`${date}T${time || '00:00'}`);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString();
}

/** ISO → локальные date/time части для предзаполнения `<input type="date">`/`<input type="time">`. */
export function toLocalDateTimeParts(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: '', time: '' };
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}
