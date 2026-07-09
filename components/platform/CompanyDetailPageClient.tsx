'use client';

import Link from 'next/link';
import { useState, type ChangeEvent, type ReactNode } from 'react';
import CompanyGrantsSection from '@/components/platform/CompanyGrantsSection';
import ImpersonateButton from '@/components/platform/ImpersonateButton';
import Button from '@/components/ui/Button';
import type { PlatformCompanyDetail, SubscriptionStatus } from '@/types/platform';
import type { PlatformRole, UserRole } from '@prisma/client';

interface CompanyDetailPageClientProps {
  company: PlatformCompanyDetail;
  viewerRole: PlatformRole;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Администратор',
  HEAD: 'Руководитель',
  MANAGER: 'Менеджер',
};

const SUBSCRIPTION_LABELS: Record<SubscriptionStatus, string> = {
  none: 'Не задано',
  ok: 'Активна',
  expiring: 'Скоро продление',
  overdue: 'Просрочено',
};

function toDateInputValue(iso: string | null): string {
  if (!iso) {
    return '';
  }

  return iso.slice(0, 10);
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

function SubscriptionStatusBadge({
  status,
}: {
  status: SubscriptionStatus;
}): ReactNode {
  const isAlert = status === 'expiring' || status === 'overdue';

  if (isAlert) {
    return (
      <span className="inline-flex rounded-[20px] bg-[#FEF2F2] px-2.5 py-1 text-[12px] font-medium text-[#DC2626]">
        {SUBSCRIPTION_LABELS[status]}
      </span>
    );
  }

  if (status === 'none') {
    return (
      <span className="inline-flex rounded-[20px] bg-[var(--color-bg-surface-2)] px-2.5 py-1 text-[12px] font-medium text-[var(--color-text-secondary)]">
        {SUBSCRIPTION_LABELS[status]}
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-[20px] bg-[#D1FAE5] px-2.5 py-1 text-[12px] font-medium text-[#065F46]">
      {SUBSCRIPTION_LABELS[status]}
    </span>
  );
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
  viewerRole,
}: CompanyDetailPageClientProps): ReactNode {
  const [company, setCompany] = useState(initialCompany);
  const [isBlockPending, setIsBlockPending] = useState(false);
  const [paymentDateInput, setPaymentDateInput] = useState(
    toDateInputValue(initialCompany.nextPaymentAt),
  );
  const [isPaymentPending, setIsPaymentPending] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [idCopied, setIdCopied] = useState(false);

  async function handleCopyId(): Promise<void> {
    try {
      await navigator.clipboard.writeText(company.id);
      setIdCopied(true);
      setTimeout(() => setIdCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy company id:', error);
    }
  }

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

  async function handleSavePaymentDate(
    nextPaymentAt: string | null,
  ): Promise<void> {
    const previousCompany = company;
    const previousInput = paymentDateInput;

    setPaymentError(null);
    setIsPaymentPending(true);
    setPaymentDateInput(nextPaymentAt ?? '');
    setCompany((prev) => ({
      ...prev,
      nextPaymentAt: nextPaymentAt
        ? new Date(`${nextPaymentAt}T00:00:00.000Z`).toISOString()
        : null,
    }));

    try {
      const response = await fetch(`/api/platform/companies/${company.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextPaymentAt }),
      });

      if (!response.ok) {
        throw new Error('Failed to update payment date');
      }

      const updated = (await response.json()) as {
        nextPaymentAt: string | null;
        subscriptionStatus: SubscriptionStatus;
      };

      setCompany((prev) => ({
        ...prev,
        nextPaymentAt: updated.nextPaymentAt,
        subscriptionStatus: updated.subscriptionStatus,
      }));
      setPaymentDateInput(toDateInputValue(updated.nextPaymentAt));
    } catch (error) {
      console.error(error);
      setCompany(previousCompany);
      setPaymentDateInput(previousInput);
      setPaymentError('Не удалось сохранить дату продления');
    } finally {
      setIsPaymentPending(false);
    }
  }

  async function handlePaymentDateChange(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const value = event.target.value;
    if (!value) {
      return;
    }

    await handleSavePaymentDate(value);
  }

  async function handleClearPaymentDate(): Promise<void> {
    await handleSavePaymentDate(null);
  }

  const subscriptionAlert =
    company.subscriptionStatus === 'expiring' ||
    company.subscriptionStatus === 'overdue';

  // Суперадмин видит эту страницу только владея правами (свои компании) либо
  // получив companyId вручную от маркетолога — второй случай специально не
  // ограничен company.manageable, иначе «войти по ID» ничего бы не давало.
  const canImpersonate = viewerRole === 'SUPER_ADMIN';

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
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-medium tracking-[-0.01em] text-[var(--color-text-primary)]">
              {company.name}
            </h1>
            <CompanyStatusBadge isBlocked={company.isBlocked} />
            {company.ownedByMarketer ? (
              <span className="inline-flex rounded-[20px] bg-[var(--color-bg-surface-2)] px-2.5 py-1 text-[12px] font-medium text-[var(--color-text-secondary)]">
                Компания маркетолога
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-mono text-[12px] text-[var(--color-text-secondary)]">
              ID: {company.id}
            </span>
            <button
              type="button"
              onClick={handleCopyId}
              className="
                text-[12px] font-medium text-[var(--color-text-secondary)]
                underline underline-offset-2 transition-colors duration-150
                hover:text-[var(--color-text-primary)]
              "
            >
              {idCopied ? 'Скопировано' : 'Скопировать'}
            </button>
          </div>
        </div>

        {company.manageable ? (
          company.isBlocked ? (
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
          )
        ) : null}
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

      <section
        className={`
          mb-8 rounded-[14px] border border-[0.5px]
          bg-[var(--color-bg-surface)] p-5
          ${subscriptionAlert ? 'border-[#FECACA] bg-[#FEF2F2]/40' : 'border-[var(--color-border)]'}
        `}
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h2 className="text-[20px] font-medium text-[var(--color-text-primary)]">
            Подписка
          </h2>
          <SubscriptionStatusBadge status={company.subscriptionStatus} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
              Следующий платёж
            </p>
            <p
              className={`text-[14px] ${
                subscriptionAlert
                  ? 'text-[#DC2626]'
                  : 'text-[var(--color-text-primary)]'
              }`}
            >
              {company.nextPaymentAt
                ? formatDate(company.nextPaymentAt)
                : 'Не задано'}
            </p>
          </div>

          {company.manageable ? (
            <div>
              <label
                htmlFor="next-payment-at"
                className="mb-1 block text-[11px] font-medium text-[var(--color-text-secondary)]"
              >
                Установить или изменить дату
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  id="next-payment-at"
                  type="date"
                  value={paymentDateInput}
                  disabled={isPaymentPending}
                  onChange={handlePaymentDateChange}
                  className="
                    h-[36px] rounded-[6px] border border-[0.5px]
                    border-[var(--color-border)] bg-[var(--color-bg-surface)]
                    px-3 text-[13px] text-[var(--color-text-primary)]
                    disabled:opacity-60
                  "
                />
                {company.nextPaymentAt ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={isPaymentPending}
                    onClick={handleClearPaymentDate}
                  >
                    Сбросить
                  </Button>
                ) : null}
              </div>
              {paymentError ? (
                <p className="mt-2 text-[12px] text-[#DC2626]" role="alert">
                  {paymentError}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {viewerRole === 'SUPER_ADMIN' && !company.ownedByMarketer ? (
        <CompanyGrantsSection
          companyId={company.id}
          grants={company.grants ?? []}
          availableMarketers={company.availableMarketers ?? []}
        />
      ) : null}

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
                  {(canImpersonate
                    ? ['Имя', 'Email', 'Роль', 'Статус', 'Действия']
                    : ['Имя', 'Email', 'Роль', 'Статус']
                  ).map(
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
                    {canImpersonate ? (
                      <td className="px-4 py-3">
                        <ImpersonateButton
                          companyId={company.id}
                          userId={user.id}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {canImpersonate ? (
          <p className="mt-3 text-[12px] text-[var(--color-text-secondary)]">
            Вход от имени пользователя логируется.
          </p>
        ) : null}
      </section>
    </main>
  );
}
