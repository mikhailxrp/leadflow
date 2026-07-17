import 'server-only';

/** Ключ для сравнения календарных месяцев без учёта дня (year*12 + month-index). */
export function yearMonthKey(year: number, month: number): number {
  return year * 12 + (month - 1);
}

/**
 * Попадает ли месяц AdSpend-записи в диапазон [from, to] (по UTC-году/месяцу дат).
 * Общая логика для GET /api/ad-spend (список за диапазон) и getFinancials.ts
 * (сумма расхода за когорту отчёта) — не дублировать её в двух местах.
 */
export function isWithinRange(
  record: { year: number; month: number },
  from?: string,
  to?: string,
): boolean {
  const key = yearMonthKey(record.year, record.month);

  if (from) {
    const fromDate = new Date(from);
    if (key < yearMonthKey(fromDate.getUTCFullYear(), fromDate.getUTCMonth() + 1)) return false;
  }

  if (to) {
    const toDate = new Date(to);
    if (key > yearMonthKey(toDate.getUTCFullYear(), toDate.getUTCMonth() + 1)) return false;
  }

  return true;
}
