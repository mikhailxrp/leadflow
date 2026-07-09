'use client';

import { useEffect, useState } from 'react';
import type { EventType } from '@prisma/client';
import Button from '@/components/ui/Button';
import type { PlatformLogItem, PlatformLogsResponse } from '@/types/platform';

interface PlatformLogsTableProps {
  companyId: string;
  type: EventType | undefined;
  from: string;
  to: string;
  leadId: string | undefined;
  leadPathModeWithoutLead: boolean;
  page: number;
  onPageChange: (page: number) => void;
}

function toDayBoundaryIso(date: string, boundary: 'start' | 'end'): string {
  return boundary === 'start'
    ? `${date}T00:00:00.000Z`
    : `${date}T23:59:59.999Z`;
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function PlatformLogsTable({
  companyId,
  type,
  from,
  to,
  leadId,
  leadPathModeWithoutLead,
  page,
  onPageChange,
}: PlatformLogsTableProps) {
  const [items, setItems] = useState<PlatformLogItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId || leadPathModeWithoutLead) {
      return;
    }

    const controller = new AbortController();

    async function fetchLogs(): Promise<void> {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ companyId, page: String(page) });
        if (type) params.set('type', type);
        if (from) params.set('from', toDayBoundaryIso(from, 'start'));
        if (to) params.set('to', toDayBoundaryIso(to, 'end'));
        if (leadId) params.set('leadId', leadId);

        const response = await fetch(`/api/platform/logs?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch platform logs');
        }

        const data = (await response.json()) as PlatformLogsResponse;
        setItems(data.items);
        setHasMore(data.hasMore);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        console.error(err);
        setError('Не удалось загрузить логи');
        setItems([]);
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLogs();

    return () => controller.abort();
  }, [companyId, type, from, to, leadId, leadPathModeWithoutLead, page]);

  if (!companyId) {
    return (
      <p className="py-12 text-center text-[14px] text-[var(--color-text-secondary)]">
        Выберите компанию, чтобы увидеть события
      </p>
    );
  }

  if (leadPathModeWithoutLead) {
    return (
      <p className="py-12 text-center text-[14px] text-[var(--color-text-secondary)]">
        Найдите и выберите лид, чтобы увидеть его путь
      </p>
    );
  }

  if (error) {
    return (
      <p className="py-12 text-center text-[14px] text-[#EF4444]" role="alert">
        {error}
      </p>
    );
  }

  if (!isLoading && items.length === 0) {
    return (
      <p className="py-12 text-center text-[14px] text-[var(--color-text-secondary)]">
        Нет событий за выбранный период
      </p>
    );
  }

  return (
    <div>
      <div
        className={`
          custom-scrollbar max-h-[560px] overflow-y-auto overflow-x-auto rounded-[14px]
          border border-[0.5px] border-[var(--color-border)]
          bg-[var(--color-bg-surface)]
          ${isLoading ? 'opacity-60' : ''}
        `}
      >
        <table className="w-full min-w-[700px] text-left">
          <thead className="sticky top-0 z-10 bg-[var(--color-bg-surface)]">
            <tr className="border-b border-[0.5px] border-[var(--color-border)]">
              {['Дата', 'Событие', 'Актор', 'Лид'].map((header) => (
                <th
                  key={header}
                  className="
                    whitespace-nowrap px-4 py-3
                    text-[11px] font-medium text-[var(--color-text-secondary)]
                  "
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="
                  border-b border-[0.5px] border-[var(--color-border)]
                  last:border-b-0 transition-colors duration-150
                  hover:bg-[var(--color-bg-surface-2)]
                "
              >
                <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
                  {formatDateTime(item.createdAt)}
                </td>
                <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                  {item.label}
                </td>
                <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                  {item.actorLabel}
                </td>
                <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                  {item.leadLabel ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-[12px] text-[var(--color-text-secondary)]">
          Страница {page}
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page <= 1 || isLoading}
            onClick={() => onPageChange(page - 1)}
          >
            Назад
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!hasMore || isLoading}
            onClick={() => onPageChange(page + 1)}
          >
            Вперёд
          </Button>
        </div>
      </div>
    </div>
  );
}
