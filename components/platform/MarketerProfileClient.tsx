'use client';

import Link from 'next/link';
import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { MobileCard, MobileCardRow } from '@/components/platform/MobileCard';
import type { MarketerCompanyItem, MarketerDetail } from '@/types/platform';

interface MarketerProfileClientProps {
  marketer: MarketerDetail;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
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
    <>
      {/* Мобильные карточки (< lg) */}
      <div className="flex flex-col gap-3 xl:hidden">
        {companies.map((company) => (
          <MobileCard key={company.id}>
            <div className="mb-3 flex items-start justify-between gap-2">
              <p className="break-words text-[15px] font-medium text-[var(--color-text-primary)]">
                {company.name}
              </p>
              <CompanyStatusBadge isBlocked={company.isBlocked} />
            </div>
            <MobileCardRow label="Дата создания">
              {formatDate(company.createdAt)}
            </MobileCardRow>
          </MobileCard>
        ))}
      </div>

      {/* Таблица (≥ lg) */}
      <div
        className="
          hidden overflow-x-auto rounded-[14px]
          border border-[0.5px] border-[var(--color-border)]
          bg-[var(--color-bg-surface)] xl:block
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
                {company.name}
              </td>
              <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                {formatDate(company.createdAt)}
              </td>
              <td className="px-4 py-3">
                <CompanyStatusBadge isBlocked={company.isBlocked} />
              </td>
            </tr>
          ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function MarketerProfileClient({
  marketer: initialMarketer,
}: MarketerProfileClientProps): ReactNode {
  const [marketer, setMarketer] = useState<MarketerDetail>(initialMarketer);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [nameInput, setNameInput] = useState(marketer.name);
  const [phoneInput, setPhoneInput] = useState(marketer.phone ?? '');
  const [telegramInput, setTelegramInput] = useState(marketer.telegram ?? '');
  const [vkInput, setVkInput] = useState(marketer.vk ?? '');
  const [maxInput, setMaxInput] = useState(marketer.max ?? '');

  function startEditing(): void {
    setNameInput(marketer.name);
    setPhoneInput(marketer.phone ?? '');
    setTelegramInput(marketer.telegram ?? '');
    setVkInput(marketer.vk ?? '');
    setMaxInput(marketer.max ?? '');
    setProfileError(null);
    setIsEditing(true);
  }

  function cancelEditing(): void {
    setIsEditing(false);
    setProfileError(null);
  }

  async function handleSaveProfile(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setProfileError(null);
    setIsSavingProfile(true);

    try {
      const response = await fetch('/api/platform/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.trim(),
          phone: phoneInput.trim(),
          telegram: telegramInput.trim() || null,
          vk: vkInput.trim() || null,
          max: maxInput.trim() || null,
        }),
      });

      const data: MarketerDetail & { error?: string } = await response.json();

      if (!response.ok) {
        setProfileError(data.error ?? 'Не удалось сохранить профиль');
        return;
      }

      setMarketer(data);
      setIsEditing(false);
    } catch (error) {
      console.error(error);
      setProfileError('Не удалось сохранить профиль');
    } finally {
      setIsSavingProfile(false);
    }
  }

  function handleAvatarButtonClick(): void {
    fileInputRef.current?.click();
  }

  async function handleAvatarChange(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setAvatarError(null);
    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/platform/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      const data: { avatarUrl?: string; error?: string } =
        await response.json();

      if (!response.ok) {
        setAvatarError(data.error ?? 'Не удалось загрузить аватар');
        return;
      }

      setMarketer((prev) => ({ ...prev, avatarUrl: data.avatarUrl ?? null }));
    } catch (error) {
      console.error(error);
      setAvatarError('Не удалось загрузить аватар');
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  async function handleAvatarDelete(): Promise<void> {
    setAvatarError(null);
    setIsUploadingAvatar(true);

    try {
      const response = await fetch('/api/platform/profile/avatar', {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete avatar');
      }

      setMarketer((prev) => ({ ...prev, avatarUrl: null }));
    } catch (error) {
      console.error(error);
      setAvatarError('Не удалось удалить аватар');
    } finally {
      setIsUploadingAvatar(false);
    }
  }

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-8">
      <h1 className="mb-6 text-[22px] font-medium tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[28px]">
        Профиль
      </h1>

      <section
        className="
          mb-8 rounded-[14px] border border-[0.5px]
          border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5
        "
      >
        <div className="flex flex-col gap-5 sm:flex-row">
          <div className="flex flex-col items-center gap-3">
            <Avatar
              initials={getInitials(marketer.name)}
              src={marketer.avatarUrl ?? undefined}
              size="lg"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <div className="mt-auto flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={isUploadingAvatar}
                onClick={handleAvatarButtonClick}
              >
                {isUploadingAvatar
                  ? 'Загрузка…'
                  : marketer.avatarUrl
                    ? 'Заменить'
                    : 'Загрузить'}
              </Button>
              {marketer.avatarUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isUploadingAvatar}
                  onClick={handleAvatarDelete}
                >
                  Удалить
                </Button>
              ) : null}
            </div>
            {avatarError ? (
              <p className="max-w-[160px] text-center text-[12px] text-[#DC2626]" role="alert">
                {avatarError}
              </p>
            ) : null}
          </div>

          <div className="flex-1">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[16px] font-medium text-[var(--color-text-primary)]">
                Контакты
              </h2>
              {!isEditing ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={startEditing}
                >
                  Редактировать
                </Button>
              ) : null}
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label="ФИО"
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                    required
                  />
                  <Input
                    label="Телефон"
                    value={phoneInput}
                    onChange={(event) => setPhoneInput(event.target.value)}
                    required
                  />
                  <Input
                    label="Telegram"
                    placeholder="@username"
                    value={telegramInput}
                    onChange={(event) => setTelegramInput(event.target.value)}
                  />
                  <Input
                    label="VK"
                    placeholder="vk.com/id или @username"
                    value={vkInput}
                    onChange={(event) => setVkInput(event.target.value)}
                  />
                  <Input
                    label="Max"
                    value={maxInput}
                    onChange={(event) => setMaxInput(event.target.value)}
                  />
                </div>

                {profileError ? (
                  <p className="text-[12px] text-[#DC2626]" role="alert">
                    {profileError}
                  </p>
                ) : null}

                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={isSavingProfile}>
                    {isSavingProfile ? 'Сохранение…' : 'Сохранить'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isSavingProfile}
                    onClick={cancelEditing}
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            ) : (
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
              </dl>
            )}
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-[20px] font-medium text-[var(--color-text-primary)]">
          Мои компании
        </h2>
        <CompaniesList
          companies={marketer.companies}
          emptyText="Вы ещё не создали ни одной компании"
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

      <p className="mt-8 text-[12px] text-[var(--color-text-secondary)]">
        Компании открываются на странице{' '}
        <Link
          href="/platform/companies"
          className="underline underline-offset-2 hover:text-[var(--color-text-primary)]"
        >
          «Компании»
        </Link>
        .
      </p>
    </main>
  );
}
