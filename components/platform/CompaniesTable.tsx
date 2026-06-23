'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import type { PlatformCompanyListItem } from '@/types/platform';

interface CompaniesTableProps {
  companies: PlatformCompanyListItem[];
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatLastLogin(value: string | null): string {
  if (!value) {
    return 'Никогда';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function StatusBadge({ isBlocked }: { isBlocked: boolean }): ReactNode {
  if (isBlocked) {
    return (
      <span className="inline-flex rounded-[20px] bg-[#FEF2F2] px-2.5 py-1 text-[12px] font-medium text-[#DC2626]">
        Заблокирована
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-[20px] bg-[#D1FAE5] px-2.5 py-1 text-[12px] font-medium text-[#065F46]">
      Активна
    </span>
  );
}

export default function CompaniesTable({
  companies: initialCompanies,
}: CompaniesTableProps): ReactNode {
  const [companies, setCompanies] =
    useState<PlatformCompanyListItem[]>(initialCompanies);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  async function handleToggleBlock(
    company: PlatformCompanyListItem,
  ): Promise<void> {
    const nextBlocked = !company.isBlocked;

    setCompanies((prev) =>
      prev.map((item) =>
        item.id === company.id ? { ...item, isBlocked: nextBlocked } : item,
      ),
    );
    setPendingIds((prev) => new Set(prev).add(company.id));

    try {
      const response = await fetch(`/api/platform/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: nextBlocked }),
      });

      if (!response.ok) {
        throw new Error('Failed to update company status');
      }
    } catch (error) {
      console.error(error);
      setCompanies((prev) =>
        prev.map((item) =>
          item.id === company.id ? { ...item, isBlocked: company.isBlocked } : item,
        ),
      );
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(company.id);
        return next;
      });
    }
  }

  if (companies.length === 0) {
    return (
      <p className="py-12 text-center text-[14px] text-[var(--color-text-secondary)]">
        Компании ещё не созданы
      </p>
    );
  }

  return (
    <div
      className="
        overflow-x-auto rounded-[14px]
        border border-[0.5px] border-[var(--color-border)]
        bg-[var(--color-bg-surface)]
      "
    >
      <table className="w-full min-w-[900px] text-left">
        <thead>
          <tr className="border-b border-[0.5px] border-[var(--color-border)]">
            {[
              'Название',
              'Статус',
              'Пользователей',
              'Последний вход',
              'Создана',
              'Действия',
            ].map((header) => (
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
          {companies.map((company) => {
            const isPending = pendingIds.has(company.id);
            const rowTextClass = company.isBlocked
              ? 'text-[var(--color-text-secondary)]'
              : 'text-[var(--color-text-primary)]';

            return (
              <tr
                key={company.id}
                className="
                  border-b border-[0.5px] border-[var(--color-border)]
                  last:border-b-0 transition-colors duration-150
                  hover:bg-[var(--color-bg-surface-2)]
                "
              >
                <td className={`px-4 py-3 text-[14px] ${rowTextClass}`}>
                  <Link
                    href={`/platform/companies/${company.id}`}
                    className="block -mx-4 -my-3 px-4 py-3"
                  >
                    {company.name}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/platform/companies/${company.id}`}
                    className="block -mx-4 -my-3 px-4 py-3"
                  >
                    <StatusBadge isBlocked={company.isBlocked} />
                  </Link>
                </td>
                <td className={`px-4 py-3 text-[14px] ${rowTextClass}`}>
                  <Link
                    href={`/platform/companies/${company.id}`}
                    className="block -mx-4 -my-3 px-4 py-3"
                  >
                    {company.userCount}
                  </Link>
                </td>
                <td className={`px-4 py-3 text-[14px] ${rowTextClass}`}>
                  <Link
                    href={`/platform/companies/${company.id}`}
                    className="block -mx-4 -my-3 px-4 py-3"
                  >
                    {formatLastLogin(company.lastLoginAt)}
                  </Link>
                </td>
                <td className={`px-4 py-3 text-[14px] ${rowTextClass}`}>
                  <Link
                    href={`/platform/companies/${company.id}`}
                    className="block -mx-4 -my-3 px-4 py-3"
                  >
                    {formatDate(company.createdAt)}
                  </Link>
                </td>
                <td className="px-4 py-3" data-actions="true">
                  {company.isBlocked ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleToggleBlock(company)}
                    >
                      Разблокировать
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleToggleBlock(company)}
                    >
                      Заблокировать
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
