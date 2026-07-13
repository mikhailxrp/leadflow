import type { ReactNode } from 'react';
import Card from '@/components/ui/Card';
import type { BySourceRow } from '@/types/reports';

interface BySourceTableProps {
  rows: BySourceRow[];
}

const SOURCE_LABELS: Record<string, string> = {
  tilda: 'Tilda',
  wordpress: 'WordPress',
  yandex: 'Директ',
  api: 'API',
  manual: 'Вручную',
  csv: 'Импорт',
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source;
}

const TABLE_COLUMNS = ['ИСТОЧНИК', 'КОЛИЧЕСТВО', 'КОНВЕРСИЯ'] as const;

export default function BySourceTable({ rows }: BySourceTableProps): ReactNode {
  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse">
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
                  Нет лидов за выбранный период
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.source}
                  className="
                    border-b-[0.5px] border-[var(--color-border)]
                    last:border-0 transition-colors duration-150
                    hover:bg-[var(--color-bg-surface-2)]
                  "
                >
                  <td className="px-4 py-3 text-[14px] font-medium text-[var(--color-text-primary)]">
                    {sourceLabel(row.source)}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
                    {row.count}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
                    {Math.round(row.wonRate * 100)}%
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
