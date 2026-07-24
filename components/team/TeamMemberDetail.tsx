import Link from 'next/link';
import type { ReactNode } from 'react';
import MobileMenuButton from '@/components/layout/MobileMenuButton';
import Avatar from '@/components/ui/Avatar';
import type { UserProfileDetail } from '@/types/users';

interface TeamMemberDetailProps {
  member: UserProfileDetail;
}

const ROLE_LABELS: Record<UserProfileDetail['role'], string> = {
  ADMIN: 'Администратор',
  HEAD: 'Руководитель',
  MANAGER: 'Менеджер',
};

const ROLE_BADGE_CLASS: Record<UserProfileDetail['role'], string> = {
  ADMIN: 'bg-[#D1FAE5] text-[#065F46]',
  HEAD: 'bg-[#DBEAFE] text-[#1E40AF]',
  MANAGER: 'bg-[var(--color-bg-surface-2)] text-[var(--color-text-secondary)]',
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

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function StatusBadge({ isBlocked }: { isBlocked: boolean }): ReactNode {
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

export default function TeamMemberDetail({ member }: TeamMemberDetailProps): ReactNode {
  return (
    <>
      {/* Мобильная шапка (< lg) — единственная точка открытия сайдбара на этой странице */}
      <div
        className="
          sticky top-0 z-30 flex h-[56px] flex-shrink-0 items-center
          border-b-[0.5px] border-[var(--color-border)]
          bg-[var(--color-bg-surface)] px-4 lg:hidden
        "
      >
        <MobileMenuButton />
      </div>

      <main className="min-h-0 flex-1 overflow-auto px-6 py-8">
      <Link
        href="/team"
        className="
          mb-4 inline-flex items-center gap-1
          text-[13px] text-[var(--color-text-secondary)]
          transition-colors duration-150
          hover:text-[var(--color-text-primary)]
        "
      >
        ← Команда
      </Link>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-[28px] font-medium tracking-[-0.01em] text-[var(--color-text-primary)]">
          {member.name}
        </h1>
        <span
          className={`rounded-[20px] px-3 py-1 text-[12px] font-medium ${ROLE_BADGE_CLASS[member.role]}`}
        >
          {ROLE_LABELS[member.role]}
        </span>
        <StatusBadge isBlocked={member.isBlocked} />
      </div>

      <p className="mb-4 text-[12px] text-[var(--color-text-secondary)]">
        Профиль редактирует только сам сотрудник — здесь только просмотр.
      </p>

      <section
        className="
          rounded-[14px] border border-[0.5px]
          border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5
        "
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <Avatar
            initials={getInitials(member.name)}
            src={member.avatarUrl ?? undefined}
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
                <dd className="text-[14px] text-[var(--color-text-primary)]">{member.email}</dd>
              </div>
              <div>
                <dt className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  Телефон
                </dt>
                <dd className="text-[14px] text-[var(--color-text-primary)]">
                  {member.phone || 'Не указан'}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  Telegram
                </dt>
                <dd className="text-[14px] text-[var(--color-text-primary)]">
                  {member.telegram || '—'}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  Max
                </dt>
                <dd className="text-[14px] text-[var(--color-text-primary)]">
                  {member.max || '—'}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  Другой контакт
                </dt>
                <dd className="text-[14px] text-[var(--color-text-primary)]">
                  {member.otherContact || '—'}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  Последний вход
                </dt>
                <dd className="text-[14px] text-[var(--color-text-primary)]">
                  {formatLastLogin(member.lastLoginAt)}
                </dd>
              </div>
              <div>
                <dt className="mb-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
                  В системе с
                </dt>
                <dd className="text-[14px] text-[var(--color-text-primary)]">
                  {formatDate(member.createdAt)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
      </main>
    </>
  );
}
