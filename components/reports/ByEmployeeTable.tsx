import type { ReactNode } from 'react';
import Card from '@/components/ui/Card';
import type { ManagerStat } from '@/types/control';

interface ByEmployeeTableProps {
  rows: ManagerStat[];
}

const TABLE_COLUMNS = [
  'СОТРУДНИК',
  'ПОЛУЧЕНО',
  'ВОВРЕМЯ',
  'ЗАВИСЛО',
  'СДЕЛОК',
  'ОТКАЗОВ',
  'БЕЗ ПРИЧИНЫ',
] as const;

export default function ByEmployeeTable({ rows }: ByEmployeeTableProps): ReactNode {
  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b-[0.5px] border-[var(--color-border)]">
              {TABLE_COLUMNS.map((column) => (
                <th
                  key={column}
                  className="px-4 py-3 text-left text-[11px] font-medium tracking-[0.05em] text-[var(--color-text-secondary)] uppercase"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length}
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
                  <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
                    {row.received}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
                    {row.processedOnTime}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
                    {row.stuck}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
                    {row.wonCount}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
                    {row.lostCount}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
                    {row.lostWithoutReason}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
