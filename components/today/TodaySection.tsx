import { type ReactNode } from 'react';
import Link from 'next/link';

const LIST_ITEMS_CLASSNAME = 'divide-y divide-[var(--color-border)]';
const GRID_ITEMS_CLASSNAME = 'grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3';

interface TodaySectionProps<T> {
  title: string;
  items: T[];
  total: number;
  renderRow: (item: T) => ReactNode;
  /** Только для блоков лидов — блоки задач не ведут в отдельный список, ссылка не показывается. */
  moreHref?: string;
  /** 'grid' — компактные карточки лидов; 'list' (по умолчанию) — построчный список задач. */
  layout?: 'list' | 'grid';
}

export default function TodaySection<T extends { id: string }>({
  title,
  items,
  total,
  renderRow,
  moreHref,
  layout = 'list',
}: TodaySectionProps<T>): ReactNode {
  if (items.length === 0) return null;

  return (
    <section className="rounded-[12px] border border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <header className="flex items-center justify-between border-b border-[0.5px] border-[var(--color-border)] px-4 py-3">
        <h2 className="text-[14px] font-medium text-[var(--color-text-primary)]">{title}</h2>
        <span className="text-[12px] text-[var(--color-text-tertiary)]">{total}</span>
      </header>

      <div className={layout === 'grid' ? GRID_ITEMS_CLASSNAME : LIST_ITEMS_CLASSNAME}>
        {items.map((item) => (
          <div key={item.id}>{renderRow(item)}</div>
        ))}
      </div>

      {moreHref && total > items.length && (
        <Link
          href={moreHref}
          className="block px-4 py-2.5 text-center text-[12px] text-[var(--color-primary)] hover:underline"
        >
          Показать все {total}
        </Link>
      )}
    </section>
  );
}
