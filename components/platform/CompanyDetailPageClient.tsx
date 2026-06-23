'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import ImpersonateButton from '@/components/platform/ImpersonateButton';
import Button from '@/components/ui/Button';
import type { PlatformCompanyDetail } from '@/types/platform';
import type { UserRole } from '@prisma/client';

interface CompanyDetailPageClientProps {
  company: PlatformCompanyDetail;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Администратор',
  HEAD: 'Руководитель',
  MANAGER: 'Менеджер',
};

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

function CompanyStatusBadge({ isBlocked }: { isBlocked: boolean }): ReactNode {
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

function UserStatusBadge({ isBlocked }: { isBlocked: boolean }): ReactNode {
  if (isBlocked) {
    return (
      <span className="inline-flex rounded-[20px] bg-[#FEF2F2] px-2.5 py-1 text-[12px] font-medium text-[#DC2626]">
        Заблокирован
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-[20px] bg-[#D1FAE5] px-2.5 py-1 text-[12px] font-medium text-[#065F46]">
      Активен
    </span>
  );
}

function RoleBadge({ role }: { role: UserRole }): ReactNode {
  return (
    <span className="inline-flex rounded-[20px] bg-[var(--color-bg-surface-2)] px-2.5 py-1 text-[12px] font-medium text-[var(--color-text-primary)]">
      {ROLE_LABELS[role]}
    </span>
  );
}

export default function CompanyDetailPageClient({
  company: initialCompany,
}: CompanyDetailPageClientProps): ReactNode {
  const [company, setCompany] = useState(initialCompany);
  const [isBlockPending, setIsBlockPending] = useState(false);

  async function handleToggleBlock(): Promise<void> {
    const nextBlocked = !company.isBlocked;
    setCompany((prev) => ({ ...prev, isBlocked: nextBlocked }));
    setIsBlockPending(true);

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
      setCompany((prev) => ({ ...prev, isBlocked: !nextBlocked }));
    } finally {
      setIsBlockPending(false);
    }
  }

  return (
    <main className="px-6 py-8">
      <Link
        href="/platform/companies"
        className="
          mb-4 inline-flex items-center gap-1
          text-[13px] text-[var(--color-text-secondary)]
          transition-colors duration-150
          hover:text-[var(--color-text-primary)]
        "
      >
        ← Компании
      </Link>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] font-medium tracking-[-0.01em] text-[var(--color-text-primary)]">
            {company.name}
          </h1>
          <CompanyStatusBadge isBlocked={company.isBlocked} />
        </div>

        {company.isBlocked ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={isBlockPending}
            onClick={handleToggleBlock}
          >
            Разблокировать компанию
          </Button>
        ) : (
          <Button
            variant="danger"
            size="sm"
            disabled={isBlockPending}
            onClick={handleToggleBlock}
          >
            Заблокировать компанию
          </Button>
        )}
      </div>

      <section
        className="
          mb-8 grid gap-4 rounded-[14px]
          border border-[0.5px] border-[var(--color-border)]
          bg-[var(--color-bg-surface)] p-5
          sm:grid-cols-3
        "
      >
        <div>
          <p className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
            Дата создания
          </p>
          <p className="text-[14px] text-[var(--color-text-primary)]">
            {formatDate(company.createdAt)}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
            Число лидов
          </p>
          <p className="text-[14px] text-[var(--color-text-primary)]">
            {company.leadCount}
          </p>
        </div>
        <div>
          <p className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
            Последний вход
          </p>
          <p className="text-[14px] text-[var(--color-text-primary)]">
            {formatLastLogin(company.lastLoginAt)}
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-[20px] font-medium text-[var(--color-text-primary)]">
          Пользователи компании
        </h2>

        {company.users.length === 0 ? (
          <div
            className="
              rounded-[14px] border border-[0.5px] border-[var(--color-border)]
              bg-[var(--color-bg-surface)] px-5 py-8 text-center
            "
          >
            <p className="text-[14px] text-[var(--color-text-primary)]">
              Пользователей пока нет
            </p>
            {company.pendingInviteEmail ? (
              <p className="mt-2 text-[13px] text-[var(--color-text-secondary)]">
                Ожидается регистрация администратора{' '}
                <span className="font-medium text-[var(--color-text-primary)]">
                  {company.pendingInviteEmail}
                </span>
                . Отправьте invite-ссылку и попросите пройти регистрацию — после
                этого здесь появится кнопка «Войти как поддержка».
              </p>
            ) : (
              <p className="mt-2 text-[13px] text-[var(--color-text-secondary)]">
                Кнопка «Войти как поддержка» появится в строке каждого
                пользователя после его создания.
              </p>
            )}
          </div>
        ) : (
          <div
            className="
              overflow-x-auto rounded-[14px]
              border border-[0.5px] border-[var(--color-border)]
              bg-[var(--color-bg-surface)]
            "
          >
            <table className="w-full min-w-[800px] text-left">
              <thead>
                <tr className="border-b border-[0.5px] border-[var(--color-border)]">
                  {['Имя', 'Email', 'Роль', 'Статус', 'Действия'].map(
                    (header) => (
                      <th
                        key={header}
                        className="
                          whitespace-nowrap px-4 py-3
                          text-[11px] font-medium text-[var(--color-text-secondary)]
                        "
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {company.users.map((user) => (
                  <tr
                    key={user.id}
                    className="
                      border-b border-[0.5px] border-[var(--color-border)]
                      last:border-b-0 transition-colors duration-150
                      hover:bg-[var(--color-bg-surface-2)]
                    "
                  >
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {user.email}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      <UserStatusBadge isBlocked={user.isBlocked} />
                    </td>
                    <td className="px-4 py-3">
                      <ImpersonateButton
                        companyId={company.id}
                        userId={user.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-3 text-[12px] text-[var(--color-text-secondary)]">
          Вход от имени пользователя логируется.
        </p>
      </section>
    </main>
  );
}
