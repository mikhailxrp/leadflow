'use client';

import type { ReactNode } from 'react';
import Card from '@/components/ui/Card';
import type { LossReasonRow } from '@/types/reports';

interface LossReasonsChartProps {
  rows: LossReasonRow[];
}

/**
 * Ранжированный список причин отказа: подпись + горизонтальный «мерник»
 * (ширина ∝ доле от максимума) + число. Заменил горизонтальный Recharts
 * bar-chart — на узких экранах он тратил 140px на ось подписей и рисовал
 * почти невидимый столбик; список читается на любой ширине.
 */
export default function LossReasonsChart({ rows }: LossReasonsChartProps): ReactNode {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const total = sorted.reduce((sum, row) => sum + row.count, 0);
  const maxCount = sorted.reduce((max, row) => Math.max(max, row.count), 0);

  return (
    <Card padding="lg">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[14px] font-medium text-[var(--color-text-primary)]">
          Причины отказа
        </h2>
        {total > 0 && (
          <span className="flex-shrink-0 text-[12px] text-[var(--color-text-tertiary)]">
            Всего: <span className="tabular-nums">{total}</span>
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <div className="flex h-[120px] items-center justify-center text-[13px] text-[var(--color-text-tertiary)]">
          Нет отказов за выбранный период
        </div>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {sorted.map((row) => {
            const share = total > 0 ? Math.round((row.count / total) * 100) : 0;
            const barWidth = maxCount > 0 ? (row.count / maxCount) * 100 : 0;

            return (
              <li key={row.lossReasonId ?? row.label} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-[13px] text-[var(--color-text-primary)]">
                    {row.label}
                  </span>
                  <span className="flex-shrink-0 text-[13px] font-medium tabular-nums text-[var(--color-text-primary)]">
                    {row.count}
                    <span className="ml-1.5 text-[12px] font-normal text-[var(--color-text-tertiary)]">
                      {share}%
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-bg-surface-2)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-danger)] transition-[width] duration-300"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
