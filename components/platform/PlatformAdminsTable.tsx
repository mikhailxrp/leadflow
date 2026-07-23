'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { MobileCard, MobileCardRow } from '@/components/platform/MobileCard';
import { createPlatformAdminSchema } from '@/lib/validations/platform';
import type { PlatformAdminListItem } from '@/types/platform';

interface PlatformAdminsTableProps {
  admins: PlatformAdminListItem[];
  currentAdminId: string;
}

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

export default function PlatformAdminsTable({
  admins: initialAdmins,
  currentAdminId,
}: PlatformAdminsTableProps): ReactNode {
  const [admins, setAdmins] = useState<PlatformAdminListItem[]>(initialAdmins);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<Set<string>>(new Set());

  function resetModalState(): void {
    setName('');
    setEmail('');
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

    const parsed = createPlatformAdminSchema.safeParse({
      name: name.trim(),
      email: email.trim(),
      password,
    });

    if (!parsed.success) {
      const nextFieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'name' || field === 'email' || field === 'password') {
          nextFieldErrors[field] = issue.message;
        }
      }
      setFieldErrors(nextFieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/platform/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data: PlatformAdminListItem & { error?: string } =
        await response.json();

      if (!response.ok) {
        setServerError(data.error ?? 'Не удалось создать администратора');
        return;
      }

      setAdmins((prev) => [data, ...prev]);
      handleCloseModal();
    } catch (error) {
      console.error(error);
      setServerError('Не удалось создать администратора');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteAdmin(admin: PlatformAdminListItem): Promise<void> {
    const confirmed = window.confirm(
      `Удалить платформенного администратора ${admin.email}?`,
    );
    if (!confirmed) {
      return;
    }

    setServerError(null);
    setPendingDeleteIds((prev) => new Set(prev).add(admin.id));

    try {
      const response = await fetch(`/api/platform/admins/${admin.id}`, {
        method: 'DELETE',
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setServerError(data.error ?? 'Не удалось удалить администратора');
        return;
      }

      setAdmins((prev) => prev.filter((item) => item.id !== admin.id));
    } catch (error) {
      console.error(error);
      setServerError('Не удалось удалить администратора');
    } finally {
      setPendingDeleteIds((prev) => {
        const next = new Set(prev);
        next.delete(admin.id);
        return next;
      });
    }
  }

  const sortedAdmins = useMemo(
    () =>
      [...admins].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [admins],
  );

  return (
    <main className="px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[20px] font-medium text-[var(--color-text-primary)]">
          Администраторы платформы
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
          + Добавить администратора
        </button>
      </div>

      {serverError ? (
        <p className="mb-4 text-[12px] text-[#EF4444]" role="alert">
          {serverError}
        </p>
      ) : null}

      {sortedAdmins.length === 0 ? (
        <p className="py-12 text-center text-[14px] text-[var(--color-text-secondary)]">
          Администраторы не найдены
        </p>
      ) : (
        <>
          {/* Мобильные карточки (< lg) */}
          <div className="flex flex-col gap-3 xl:hidden">
            {sortedAdmins.map((admin) => {
              const isCurrentAdmin = admin.id === currentAdminId;
              const isDeleting = pendingDeleteIds.has(admin.id);

              return (
                <MobileCard key={admin.id}>
                  <p className="mb-3 break-words text-[15px] font-medium text-[var(--color-text-primary)]">
                    {admin.name}
                  </p>
                  <div className="flex flex-col">
                    <MobileCardRow label="Email">
                      <span className="break-all">{admin.email}</span>
                    </MobileCardRow>
                    <MobileCardRow label="Дата создания">
                      {formatDate(admin.createdAt)}
                    </MobileCardRow>
                  </div>
                  <div className="mt-4 border-t border-[0.5px] border-[var(--color-border)] pt-4">
                    {isCurrentAdmin ? (
                      <span className="block text-center text-[12px] text-[var(--color-text-secondary)]">
                        Текущий администратор
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        disabled={isDeleting}
                        onClick={() => handleDeleteAdmin(admin)}
                        className="w-full"
                      >
                        {isDeleting ? 'Удаление…' : 'Удалить'}
                      </Button>
                    )}
                  </div>
                </MobileCard>
              );
            })}
          </div>

          {/* Таблица (≥ lg) */}
          <div
            className="
              hidden overflow-x-auto rounded-[14px]
              border border-[0.5px] border-[var(--color-border)]
              bg-[var(--color-bg-surface)] xl:block
            "
          >
            <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-[0.5px] border-[var(--color-border)]">
                {['Имя', 'Email', 'Дата создания', 'Действия'].map((header) => (
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
              {sortedAdmins.map((admin) => {
                const isCurrentAdmin = admin.id === currentAdminId;
                const isDeleting = pendingDeleteIds.has(admin.id);

                return (
                  <tr
                    key={admin.id}
                    className="
                      border-b border-[0.5px] border-[var(--color-border)]
                      last:border-b-0 transition-colors duration-150
                      hover:bg-[var(--color-bg-surface-2)]
                    "
                  >
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {admin.name}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {admin.email}
                    </td>
                    <td className="px-4 py-3 text-[14px] text-[var(--color-text-primary)]">
                      {formatDate(admin.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      {isCurrentAdmin ? (
                        <span className="text-[12px] text-[var(--color-text-secondary)]">
                          Текущий администратор
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          disabled={isDeleting}
                          onClick={() => handleDeleteAdmin(admin)}
                        >
                          {isDeleting ? 'Удаление…' : 'Удалить'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        </>
      )}

      {isModalOpen && (
        <Modal onClose={handleCloseModal} dialogClassName="max-w-[480px] rounded-[12px]">
          <h2 className="text-[16px] font-medium text-[var(--color-text-primary)]">
            Добавить администратора
          </h2>
          <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
            Новый администратор сможет войти через /platform/login
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
              placeholder="admin@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              error={fieldErrors.email}
            />

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="platform-admin-password"
                className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]"
              >
                Пароль
              </label>
              <div className="relative">
                <input
                  id="platform-admin-password"
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
