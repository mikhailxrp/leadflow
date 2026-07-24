import type { ReactNode } from 'react';
import Card from '@/components/ui/Card';
import type { ManagerStat } from '@/types/control';

interface ByEmployeeTableProps {
  rows: ManagerStat[];
}

const METRIC_ROWS = [
  { label: 'Получено', get: (m: ManagerStat) => m.received },
  { label: 'Вовремя', get: (m: ManagerStat) => m.processedOnTime },
  { label: 'Зависло', get: (m: ManagerStat) => m.stuck },
  { label: 'Сделок', get: (m: ManagerStat) => m.wonCount },
  { label: 'Отказов', get: (m: ManagerStat) => m.lostCount },
  { label: 'Без причины', get: (m: ManagerStat) => m.lostWithoutReason },
] as const satisfies ReadonlyArray<{ label: string; get: (m: ManagerStat) => number }>;

export default function ByEmployeeTable({ rows }: ByEmployeeTableProps): ReactNode {
  return (
    <>
      {/* Десктоп (≥ lg): таблица. w-full без min-width — без горизонтальной прокрутки. */}
      <Card padding="none" className="hidden overflow-hidden lg:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-[0.5px] border-[var(--color-border)]">
              <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--color-text-secondary)]">
                Сотрудник
              </th>
              {METRIC_ROWS.map((metric) => (
                <th
                  key={metric.label}
                  className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--color-text-secondary)]"
                >
                  {metric.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={METRIC_ROWS.length + 1}
                  className="px-4 py-8 text-center text-[14px] text-[var(--color-text-secondary)]"
                >
                  Нет данных за выбранный период
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.managerId}
                  className="
                    border-b-[0.5px] border-[var(--color-border)]
                    last:border-0 transition-colors duration-150
                    hover:bg-[var(--color-bg-surface-2)]
                  "
                >
                  <td className="px-4 py-3 text-[14px] font-medium text-[var(--color-text-primary)]">
                    {row.managerName}
                  </td>
                  {METRIC_ROWS.map((metric) => (
                    <td
                      key={metric.label}
                      className="px-4 py-3 text-[13px] tabular-nums text-[var(--color-text-secondary)]"
                    >
                      {metric.get(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Мобильные/планшет (< lg): карточки — как на странице «Контроль». */}
      {rows.length === 0 ? (
        <Card padding="lg" className="lg:hidden">
          <p className="text-center text-[14px] text-[var(--color-text-secondary)]">
            Нет данных за выбранный период
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
          {rows.map((row) => (
            <div
              key={row.managerId}
              className="rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4"
            >
              <div className="mb-3 border-b-[0.5px] border-[var(--color-border)] pb-3">
                <span className="text-[15px] font-medium text-[var(--color-text-primary)]">
                  {row.managerName}
                </span>
              </div>
              <dl className="flex flex-col gap-2">
                {METRIC_ROWS.map((metric) => (
                  <div key={metric.label} className="flex items-center justify-between gap-4">
                    <dt className="text-[13px] text-[var(--color-text-secondary)]">{metric.label}</dt>
                    <dd className="text-[14px] font-medium tabular-nums text-[var(--color-text-primary)]">
                      {metric.get(row)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
