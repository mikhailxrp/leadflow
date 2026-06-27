export const STAGE_COLOR_PALETTE = [
  { value: '#3b82f6', label: 'Синий' },
  { value: '#8b5cf6', label: 'Фиолетовый' },
  { value: '#f59e0b', label: 'Оранжевый' },
  { value: '#10b981', label: 'Зелёный' },
  { value: '#ef4444', label: 'Красный' },
  { value: '#6366f1', label: 'Индиго' },
  { value: '#6b7280', label: 'Серый' },
] as const;

export const DEFAULT_STAGE_COLOR = STAGE_COLOR_PALETTE[0].value;

export function formatLeadsCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} лид`;
  }

  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) {
    return `${count} лида`;
  }

  return `${count} лидов`;
}
