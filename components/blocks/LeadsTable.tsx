'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import Avatar from '@/components/ui/Avatar';

const LEAD_DETAIL_PATH = '/leads/1';
import {
  LeadSourceBadge,
  ListStatusBadge,
  type LeadSourceType,
  type ListStatusType,
} from '@/components/ui/Badge';

export type CellType =
  | 'text'
  | 'name'
  | 'secondary'
  | 'tertiary'
  | 'leadSource'
  | 'manager'
  | 'listStatus';

export interface ManagerCell {
  initials: string;
  name: string;
}

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  cellType?: CellType;
  widthClass?: string;
}

interface LeadsTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  keyField: keyof T;
  uppercaseHeaders?: boolean;
  /** Включает клик по строке с переходом на страницу лида */
  rowClickable?: boolean;
}

function renderCell<T extends Record<string, unknown>>(
  row: T,
  col: Column<T>,
): ReactNode {
  if (col.render) return col.render(row);

  const value = row[col.key as keyof T];

  switch (col.cellType) {
    case 'name':
      return <span className="font-medium">{String(value ?? '')}</span>;
    case 'secondary':
      return (
        <span className="text-[var(--color-text-secondary)]">
          {String(value ?? '')}
        </span>
      );
    case 'tertiary':
      return (
        <span className="text-[var(--color-text-tertiary)]">
          {String(value ?? '')}
        </span>
      );
    case 'leadSource':
      return <LeadSourceBadge source={value as LeadSourceType} />;
    case 'listStatus':
      return <ListStatusBadge status={value as ListStatusType} />;
    case 'manager': {
      const manager = value as ManagerCell;
      return (
        <div className="flex items-center gap-2">
          <Avatar initials={manager.initials} size="sm" />
          <span>{manager.name}</span>
        </div>
      );
    }
    default:
      return String(value ?? '');
  }
}

export default function LeadsTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  keyField,
  uppercaseHeaders = false,
  rowClickable = false,
}: LeadsTableProps<T>) {
  const router = useRouter();
  const isInteractive = rowClickable || Boolean(onRowClick);
  const clickHandler = isInteractive
    ? (row: T) => {
        if (onRowClick) {
          onRowClick(row);
          return;
        }
        router.push(LEAD_DETAIL_PATH);
      }
    : undefined;
  return (
    <div className="overflow-hidden rounded-[12px] border border-[var(--color-border)] border-[0.5px] bg-[var(--color-bg-surface)]">
      <div className="custom-scrollbar overflow-x-auto">
        <table className="w-full min-w-[960px] text-left">
          <thead>
            <tr className="border-b border-[var(--color-border)] border-[0.5px]">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`
                    whitespace-nowrap px-3 py-2
                    text-[11px] font-medium text-[var(--color-text-secondary)]
                    ${uppercaseHeaders ? 'uppercase tracking-wide' : ''}
                    ${col.widthClass ?? ''}
                  `}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {data.map((row) => (
              <tr
                key={String(row[keyField])}
                {...(clickHandler
                  ? { onClick: () => clickHandler(row) }
                  : {})}
                className={`
                  border-b border-[var(--color-border)] border-[0.5px] last:border-0
                  text-[13px] text-[var(--color-text-primary)]
                  transition-colors duration-150
                  ${clickHandler ? 'cursor-pointer hover:bg-[var(--color-bg-surface-2)]' : ''}
                `}
              >
                {columns.map((col) => (
                  <td key={String(col.key)} className="whitespace-nowrap px-3 py-[10px]">
                    {renderCell(row, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
