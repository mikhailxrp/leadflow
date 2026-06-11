'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';

const TOTAL_ITEMS = 248;
const PAGE_SIZE = 8;
const TOTAL_PAGES = 12;

interface LeadsPaginationProps {
  totalItems?: number;
  pageSize?: number;
  totalPages?: number;
}

function ChevronLeftIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function ChevronRightIcon() {
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

export default function LeadsPagination({
  totalItems = TOTAL_ITEMS,
  pageSize = PAGE_SIZE,
  totalPages = TOTAL_PAGES,
}: LeadsPaginationProps) {
  const [currentPage, setCurrentPage] = useState(1);

  const rangeStart = (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);
  const pageItems = getPageItems(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] text-[var(--color-text-secondary)]">
        Показано {rangeStart}-{rangeEnd} из {totalItems}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          icon={<ChevronLeftIcon />}
          aria-label="Предыдущая страница"
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
              onClick={() => setCurrentPage(item)}
              className={`
                flex h-[28px] min-w-[28px] items-center justify-center
                rounded-[6px] px-2 text-[13px] font-medium
                transition-colors duration-150
                ${item === currentPage
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface-2)]'
                }
              `}
              aria-label={`Страница ${item}`}
              aria-current={item === currentPage ? 'page' : undefined}
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
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        >
          <span className="sr-only">Вперёд</span>
        </Button>
      </div>
    </div>
  );
}
