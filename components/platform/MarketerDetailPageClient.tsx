'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import type { MarketerCompanyItem, MarketerDetail } from '@/types/platform';

interface MarketerDetailPageClientProps {
  marketer: MarketerDetail;
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

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function StatusBadge({ isActive }: { isActive: boolean }): ReactNode {
  if (isActive) {
    return (
      <span className="inline-flex rounded-[20px] bg-[#D1FAE5] px-2.5 py-1 text-[12px] font-medium text-[#065F46]">
        Активен
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-[20px] bg-[#FEF2F2] px-2.5 py-1 text-[12px] font-medium text-[#DC2626]">
      Заблокирован
    </span>
  );
}

function CompanyStatusBadge({ isBlocked }: { isBlocked: boolean }): ReactNode {
  if (isBlocked) {
    return (
      <span className="inline-flex rounded-[20px] bg-[#FEF2F2] px-2 py-0.5 text-[11px] font-medium text-[#DC2626]">
        Заблокирована
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-[20px] bg-[#D1FAE5] px-2 py-0.5 text-[11px] font-medium text-[#065F46]">
      Активна
    </span>
  );
}

function CompaniesList({
  companies,
  emptyText,
}: {
  companies: MarketerCompanyItem[];
  emptyText: string;
}): ReactNode {
  if (companies.length === 0) {
    return (
      <p className="text-[13px] text-[var(--color-text-secondary)]">
        {emptyText}
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
      <table className="w-full min-w-[520px] text-left">
        <thead>
          <tr className="border-b border-[0.5px] border-[var(--color-border)]">
            {['Название', 'Дата создания', 'Статус'].map((header) => (
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
          {companies.map((company) => (
            <tr
              key={company.id}
              className="
                border-b border-[0.5px] border-[var(--color-border)]
                last:border-b-0 transition-colors duration-150
                hover:bg-[var(--color-bg-surface-2)]
              "
            >
              <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                <Link
                  href={`/platform/companies/${company.id}`}
                  className="block -mx-4 -my-3 px-4 py-3"
                >
                  {company.name}
                </Link>
              </td>
              <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                <Link
                  href={`/platform/companies/${company.id}`}
                  className="block -mx-4 -my-3 px-4 py-3"
                >
                  {formatDate(company.createdAt)}
                </Link>
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/platform/companies/${company.id}`}
                  className="block -mx-4 -my-3 px-4 py-3"
                >
                  <CompanyStatusBadge isBlocked={company.isBlocked} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function MarketerDetailPageClient({
  marketer: initialMarketer,
}: MarketerDetailPageClientProps): ReactNode {
  const [marketer, setMarketer] = useState<MarketerDetail>(initialMarketer);
  const [isBlockPending, setIsBlockPending] = useState(false);

  async function handleToggleBlock(): Promise<void> {
    const nextIsActive = !marketer.isActive;

    const confirmed = window.confirm(
      nextIsActive
        ? `Разблокировать маркетолога ${marketer.email}? Компании, заблокированные каскадом при его блокировке, будут разблокированы.`
        : `Заблокировать маркетолога ${marketer.email}? Все его активные компании будут заблокированы каскадно, администраторы этих компаний потеряют доступ.`,
    );
    if (!confirmed) {
      return;
    }

    setIsBlockPending(true);
    try {
      const response = await fetch(`/api/platform/marketers/${marketer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextIsActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update marketer status');
      }

      setMarketer((prev) => ({ ...prev, isActive: nextIsActive }));
    } catch (error) {
      console.error(error);
    } finally {
      setIsBlockPending(false);
    }
  }

  return (
    <main className="px-6 py-8">
      <Link
        href="/platform/marketers"
        className="
          mb-4 inline-flex items-center gap-1
          text-[13px] text-[var(--color-text-secondary)]
          transition-colors duration-150
          hover:text-[var(--color-text-primary)]
        "
      >
        ← Маркетологи
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] font-medium tracking-[-0.01em] text-[var(--color-text-primary)]">
            {marketer.name}
          </h1>
          <StatusBadge isActive={marketer.isActive} />
        </div>

        <Button
          variant={marketer.isActive ? 'danger' : 'secondary'}
          size="sm"
          disabled={isBlockPending}
          onClick={handleToggleBlock}
        >
          {isBlockPending
            ? 'Обновление…'
            : marketer.isActive
              ? 'Заблокировать'
              : 'Разблокировать'}
        </Button>
      </div>

      <p className="mb-4 text-[12px] text-[var(--color-text-secondary)]">
        Профиль редактирует только сам маркетолог — здесь только просмотр.
      </p>

      <section
        className="
          mb-8 rounded-[14px] border border-[0.5px]
          border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5
        "
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar
            initials={getInitials(marketer.name)}
            src={marketer.avatarUrl ?? undefined}
            size="lg"
          />

          <div className="flex-1">
            <h2 className="mb-3 text-[16px] font-medium text-[var(--color-text-primary)]">
              Контакты
            </h2>

            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  Email
                </dt>
                <dd className="text-[14px] text-[var(--color-text-primary)]">
                  {marketer.email}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  Телефон
                </dt>
                <dd className="text-[14px] text-[var(--color-text-primary)]">
                  {marketer.phone || 'Не указан'}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  Telegram
                </dt>
                <dd className="text-[14px] text-[var(--color-text-primary)]">
                  {marketer.telegram || '—'}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  VK
                </dt>
                <dd className="text-[14px] text-[var(--color-text-primary)]">
                  {marketer.vk || '—'}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  Max
                </dt>
                <dd className="text-[14px] text-[var(--color-text-primary)]">
                  {marketer.max || '—'}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  Последний вход
                </dt>
                <dd className="text-[14px] text-[var(--color-text-primary)]">
                  {formatLastLogin(marketer.lastLoginAt)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-[20px] font-medium text-[var(--color-text-primary)]">
          Компании маркетолога
        </h2>
        <CompaniesList
          companies={marketer.companies}
          emptyText="Маркетолог ещё не создал ни одной компании"
        />
      </section>

      <section>
        <h2 className="mb-4 text-[20px] font-medium text-[var(--color-text-primary)]">
          Доступ по гранту
        </h2>
        <CompaniesList
          companies={marketer.grantedCompanies}
          emptyText="Грантов на платформенные компании не выдано"
        />
      </section>
    </main>
  );
}
