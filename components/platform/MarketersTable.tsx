'use client';

import Link from 'next/link';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { createMarketerSchema } from '@/lib/validations/platform';
import type { MarketerActivityItem } from '@/types/platform';

interface MarketersTableProps {
  marketers: MarketerActivityItem[];
}

type FieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
};

function formatDate(value: string | null): string {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export default function MarketersTable({
  marketers: initialMarketers,
}: MarketersTableProps): ReactNode {
  const [marketers, setMarketers] =
    useState<MarketerActivityItem[]>(initialMarketers);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingToggleIds, setPendingToggleIds] = useState<Set<string>>(
    new Set(),
  );

  function resetModalState(): void {
    setName('');
    setEmail('');
    setPhone('');
    setPassword('');
    setShowPassword(false);
    setFieldErrors({});
    setServerError(null);
    setIsSubmitting(false);
  }

  function handleOpenModal(): void {
    resetModalState();
    setIsModalOpen(true);
  }

  function handleCloseModal(): void {
    resetModalState();
    setIsModalOpen(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const parsed = createMarketerSchema.safeParse({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    });

    if (!parsed.success) {
      const nextFieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (
          field === 'name' ||
          field === 'email' ||
          field === 'phone' ||
          field === 'password'
        ) {
          nextFieldErrors[field] = issue.message;
        }
      }
      setFieldErrors(nextFieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/platform/marketers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data: MarketerActivityItem & { error?: string } =
        await response.json();

      if (!response.ok) {
        setServerError(data.error ?? 'Не удалось создать маркетолога');
        return;
      }

      setMarketers((prev) => [data, ...prev]);
      handleCloseModal();
    } catch (error) {
      console.error(error);
      setServerError('Не удалось создать маркетолога');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleActive(marketer: MarketerActivityItem): Promise<void> {
    const nextIsActive = !marketer.isActive;

    const confirmed = window.confirm(
      nextIsActive
        ? `Разблокировать маркетолога ${marketer.email}? Компании, заблокированные каскадом при его блокировке, будут разблокированы.`
        : `Заблокировать маркетолога ${marketer.email}? Все его активные компании будут заблокированы каскадно, администраторы этих компаний потеряют доступ.`,
    );
    if (!confirmed) {
      return;
    }

    setServerError(null);
    setPendingToggleIds((prev) => new Set(prev).add(marketer.id));

    try {
      const response = await fetch(`/api/platform/marketers/${marketer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextIsActive }),
      });

      const data: MarketerActivityItem & { error?: string } =
        await response.json();

      if (!response.ok) {
        setServerError(data.error ?? 'Не удалось изменить статус маркетолога');
        return;
      }

      setMarketers((prev) =>
        prev.map((item) => (item.id === data.id ? data : item)),
      );
    } catch (error) {
      console.error(error);
      setServerError('Не удалось изменить статус маркетолога');
    } finally {
      setPendingToggleIds((prev) => {
        const next = new Set(prev);
        next.delete(marketer.id);
        return next;
      });
    }
  }

  const sortedMarketers = useMemo(
    () => [...marketers].sort((a, b) => a.name.localeCompare(b.name)),
    [marketers],
  );

  return (
    <main className="px-6 py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
          Маркетологи
        </h1>
        <button
          type="button"
          onClick={handleOpenModal}
          className="
            inline-flex h-[36px] items-center justify-center
            rounded-[6px] bg-[#10B981] px-4
            text-[13px] font-medium text-white
            transition-colors duration-150
            hover:bg-[#0E9E6E]
          "
        >
          + Добавить маркетолога
        </button>
      </div>

      {serverError ? (
        <p className="mb-4 text-[12px] text-[#EF4444]" role="alert">
          {serverError}
        </p>
      ) : null}

      {sortedMarketers.length === 0 ? (
        <p className="py-12 text-center text-[14px] text-[var(--color-text-secondary)]">
          Маркетологи не найдены
        </p>
      ) : (
        <div
          className="
            overflow-x-auto rounded-[14px]
            border border-[0.5px] border-[var(--color-border)]
            bg-[var(--color-bg-surface)]
          "
        >
          <table className="w-full min-w-[940px] text-left">
            <thead>
              <tr className="border-b border-[0.5px] border-[var(--color-border)]">
                {[
                  'Имя',
                  'Email',
                  'Телефон',
                  'Статус',
                  'Компаний создано',
                  'Последний вход',
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
              {sortedMarketers.map((marketer) => {
                const isToggling = pendingToggleIds.has(marketer.id);

                return (
                  <tr
                    key={marketer.id}
                    className="
                      border-b border-[0.5px] border-[var(--color-border)]
                      last:border-b-0 transition-colors duration-150
                      hover:bg-[var(--color-bg-surface-2)]
                    "
                  >
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      <Link
                        href={`/platform/marketers/${marketer.id}`}
                        className="block -mx-4 -my-3 px-4 py-3"
                      >
                        {marketer.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      <Link
                        href={`/platform/marketers/${marketer.id}`}
                        className="block -mx-4 -my-3 px-4 py-3"
                      >
                        {marketer.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      <Link
                        href={`/platform/marketers/${marketer.id}`}
                        className="block -mx-4 -my-3 px-4 py-3"
                      >
                        {marketer.phone || '—'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[13px]">
                      <Link
                        href={`/platform/marketers/${marketer.id}`}
                        className="block -mx-4 -my-3 px-4 py-3"
                      >
                        {marketer.isActive ? (
                          <span className="text-[#10B981]">Активен</span>
                        ) : (
                          <span className="text-[#EF4444]">Заблокирован</span>
                        )}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      <Link
                        href={`/platform/marketers/${marketer.id}`}
                        className="block -mx-4 -my-3 px-4 py-3"
                      >
                        {marketer.companiesCreated}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      <Link
                        href={`/platform/marketers/${marketer.id}`}
                        className="block -mx-4 -my-3 px-4 py-3"
                      >
                        {formatDate(marketer.lastLoginAt)}
                      </Link>
                    </td>
                    <td className="px-4 py-3" data-actions="true">
                      <Button
                        type="button"
                        variant={marketer.isActive ? 'danger' : 'secondary'}
                        size="sm"
                        disabled={isToggling}
                        onClick={() => handleToggleActive(marketer)}
                      >
                        {isToggling
                          ? 'Обновление…'
                          : marketer.isActive
                            ? 'Заблокировать'
                            : 'Разблокировать'}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {isModalOpen && (
        <Modal onClose={handleCloseModal} dialogClassName="max-w-[480px] rounded-[12px]">
          <h2 className="text-[16px] font-medium text-[var(--color-text-primary)]">
            Добавить маркетолога
          </h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
            Маркетолог сможет войти через /platform/login
          </p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
            <Input
              label="Имя"
              placeholder="Иван Иванов"
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={fieldErrors.name}
              autoFocus
            />

            <Input
              label="Email"
              type="email"
              placeholder="marketer@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={fieldErrors.email}
            />

            <Input
              label="Телефон"
              type="tel"
              placeholder="+7 900 000-00-00"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              error={fieldErrors.phone}
            />

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="marketer-password"
                className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]"
              >
                Пароль
              </label>
              <div className="relative">
                <input
                  id="marketer-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Минимум 8 символов"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`
                    h-[36px] w-full rounded-[6px]
                    border border-[var(--color-border)] border-[0.5px]
                    bg-[var(--color-bg-surface)]
                    px-3 pr-9 text-[14px] text-[var(--color-text-primary)]
                    placeholder:text-[var(--color-text-tertiary)]
                    transition-all duration-150 outline-none
                    focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
                    ${fieldErrors.password ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]' : ''}
                  `}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] transition-colors duration-150 hover:text-[var(--color-text-secondary)]"
                  aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                >
                  <Icon icon="tabler:eye" className="h-4 w-4" />
                </button>
              </div>
              {fieldErrors.password && (
                <span className="text-[12px] text-[#EF4444]">
                  {fieldErrors.password}
                </span>
              )}
            </div>

            <div className="mt-1 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={handleCloseModal}>
                Отмена
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Создание…' : 'Создать'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
