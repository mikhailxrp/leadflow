import 'server-only';

import type { ManagerStat } from '@/types/control';
import type { BySourceRow, LossReasonRow, ReportSummary } from '@/types/reports';

const BOM = '﻿';

function escapeCsvValue(value: string | number): string {
  const str = String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function rowsToCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(','));
  return BOM + lines.join('\r\n');
}

/** Экспортирует «Лиды по периоду» (buckets) — построчный срез summary; скаляры (wonRate и т.д.) в CSV не переносятся. */
export function summaryToCsv(summary: ReportSummary): string {
  return rowsToCsv(
    ['Дата', 'Лидов'],
    summary.buckets.map((bucket) => [bucket.date, bucket.count]),
  );
}

export function lossReasonsToCsv(rows: LossReasonRow[]): string {
  return rowsToCsv(
    ['Причина', 'Количество'],
    rows.map((row) => [row.label, row.count]),
  );
}

export function byEmployeeToCsv(rows: ManagerStat[]): string {
  return rowsToCsv(
    [
      'Сотрудник',
      'Получено',
      'Обработано вовремя',
      'Зависло',
      'Сделок',
      'Отказов',
      'Отказов без причины',
    ],
    rows.map((row) => [
      row.managerName,
      row.received,
      row.processedOnTime,
      row.stuck,
      row.wonCount,
      row.lostCount,
      row.lostWithoutReason,
    ]),
  );
}

export function bySourceToCsv(rows: BySourceRow[]): string {
  return rowsToCsv(
    ['Источник', 'Количество', 'Конверсия'],
    rows.map((row) => [row.source, row.count, Math.round(row.wonRate * 1000) / 1000]),
  );
}
