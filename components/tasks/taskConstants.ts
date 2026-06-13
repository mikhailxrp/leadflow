import { type TaskStatus } from '@/components/tasks/TaskStatusBadge';

export const ASSIGNEE_OPTIONS = [
  { value: 'alexey', label: 'Алексей Д.' },
  { value: 'maria', label: 'Мария С.' },
  { value: 'ivan', label: 'Иван К.' },
] as const;

export const ASSIGNEE_LABELS: Record<string, string> = {
  alexey: 'Алексей Д.',
  maria: 'Мария С.',
  ivan: 'Иван К.',
};

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

export function formatDueDateLabel(date: string, time: string): string {
  if (!date) return '';

  const parsed = new Date(`${date}T${time || '00:00'}`);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

export function formatCompletedAtLabel(): string {
  return new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}
