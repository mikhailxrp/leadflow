import { describe, expect, it } from 'vitest';
import { minutesSinceCreated, type WorkHours } from '@/lib/risk/workHoursUtils';

// Пн–Пт 09:00–18:00, дни по спеке 1=понедельник..7=воскресенье.
const MON_FRI_9_TO_18: WorkHours = { start: '09:00', end: '18:00', days: [1, 2, 3, 4, 5] };

// 2026-07-10 — пятница, 2026-07-11 — суббота, 2026-07-12 — воскресенье, 2026-07-13 — понедельник.
function local(day: number, hours: number, minutes = 0): Date {
  return new Date(2026, 6, day, hours, minutes, 0, 0);
}

describe('minutesSinceCreated', () => {
  it('workHours = null — простая разница в минутах, без вычитания', () => {
    const createdAt = local(13, 9, 0);
    const now = local(13, 9, 45);
    expect(minutesSinceCreated(createdAt, now, null)).toBe(45);
  });

  it('лид создан в пятницу после конца рабочего дня — отсчёт начинается с понедельника 09:00', () => {
    const createdAt = local(10, 19, 0); // пятница 19:00
    const now = local(13, 9, 5); // понедельник 09:05
    expect(minutesSinceCreated(createdAt, now, MON_FRI_9_TO_18)).toBe(5);
  });

  it('выходные (суббота-воскресенье) полностью выпадают из отсчёта', () => {
    const createdAt = local(10, 17, 0); // пятница 17:00 — час до конца рабочего дня
    const now = local(13, 10, 0); // понедельник 10:00 — час после начала
    // Пятница: 17:00→18:00 = 60 мин. Пн: 09:00→10:00 = 60 мин. Итого 120.
    expect(minutesSinceCreated(createdAt, now, MON_FRI_9_TO_18)).toBe(120);
  });

  it('создан и проверен в один рабочий день — обычная разница внутри окна', () => {
    const createdAt = local(13, 10, 0);
    const now = local(13, 14, 0);
    expect(minutesSinceCreated(createdAt, now, MON_FRI_9_TO_18)).toBe(240);
  });

  it('граница: ровно от начала до конца рабочего окна — вся длительность окна', () => {
    const createdAt = local(13, 9, 0);
    const now = local(13, 18, 0);
    expect(minutesSinceCreated(createdAt, now, MON_FRI_9_TO_18)).toBe(9 * 60);
  });

  it('создан и проверен до начала рабочего окна в тот же день — 0 минут', () => {
    const createdAt = local(13, 7, 0);
    const now = local(13, 8, 30);
    expect(minutesSinceCreated(createdAt, now, MON_FRI_9_TO_18)).toBe(0);
  });

  it('лид создан в выходной день — отсчёт начинается со следующего рабочего дня', () => {
    const createdAt = local(11, 10, 0); // суббота 10:00
    const now = local(13, 9, 30); // понедельник 09:30
    expect(minutesSinceCreated(createdAt, now, MON_FRI_9_TO_18)).toBe(30);
  });

  it('now раньше или равно createdAt — 0 минут', () => {
    const createdAt = local(13, 12, 0);
    expect(minutesSinceCreated(createdAt, createdAt, MON_FRI_9_TO_18)).toBe(0);
  });
});
