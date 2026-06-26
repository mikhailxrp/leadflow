'use client';

import { type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';

function ChevronLeftIcon(): ReactNode {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon(): ReactNode {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function getPageItems(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: (number | 'ellipsis')[] = [1];

  if (current > 3) items.push('ellipsis');

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) {
    items.push(i);
  }

  if (current < total - 2) items.push('ellipsis');

  items.push(total);
  return items;
}

interface LeadsPaginationProps {
  total: number;
  page: number;
  pageSize: number;
}

export default function LeadsPagination({ total, page, pageSize }: LeadsPaginationProps): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(total / pageSize);
  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const pageItems = getPageItems(page, totalPages);

  function goToPage(newPage: number): void {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(newPage));
    router.push(`/leads?${params.toString()}`);
  }

  if (totalPages <= 1) {
    return (
      <p className="text-[13px] text-[var(--color-text-secondary)]">
        Показано {total} из {total}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] text-[var(--color-text-secondary)]">
        Показано {rangeStart}–{rangeEnd} из {total}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          icon={<ChevronLeftIcon />}
          aria-label="Предыдущая страница"
          disabled={page === 1}
          onClick={() => goToPage(Math.max(1, page - 1))}
        >
          <span className="sr-only">Назад</span>
        </Button>

        {pageItems.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              className="px-2 text-[13px] text-[var(--color-text-tertiary)]"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => goToPage(item)}
              className={`
                flex h-[28px] min-w-[28px] cursor-pointer items-center justify-center
                rounded-[6px] px-2 text-[13px] font-medium
                transition-colors duration-150
                ${item === page
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-2)]'
                }
              `}
              aria-label={`Страница ${item}`}
              aria-current={item === page ? 'page' : undefined}
            >
              {item}
            </button>
          ),
        )}

        <Button
          variant="ghost"
          size="sm"
          icon={<ChevronRightIcon />}
          aria-label="Следующая страница"
          disabled={page === totalPages}
          onClick={() => goToPage(Math.min(totalPages, page + 1))}
        >
          <span className="sr-only">Вперёд</span>
        </Button>
      </div>
    </div>
  );
}
