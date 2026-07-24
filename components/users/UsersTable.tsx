'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import type { UserRole as PrismaUserRole } from '@prisma/client';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Avatar from '@/components/ui/Avatar';
import Toast from '@/components/ui/Toast';
import AddUserModal from '@/components/users/AddUserModal';
import DeleteUserModal from '@/components/users/DeleteUserModal';
import EditUserModal from '@/components/users/EditUserModal';
import type { UserStatus } from '@/components/users/userModalShared';

export type ApiUser = {
  id: string;
  name: string;
  email: string;
  role: PrismaUserRole;
  isBlocked: boolean;
  avatarUrl: string | null;
  createdAt: string;
};

interface UsersTableProps {
  initialUsers: ApiUser[];
  currentUserId: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: PrismaUserRole;
  isBlocked: boolean;
  avatarUrl: string | null;
  createdAt: string;
}

function RoleBadge({ role }: { role: PrismaUserRole }): ReactNode {
  if (role === 'ADMIN') {
    return (
      <span className="inline-flex rounded-[20px] bg-[#D1FAE5] px-2.5 py-1 text-[12px] font-medium text-[#065F46]">
        Администратор
      </span>
    );
  }
  if (role === 'HEAD') {
    return (
      <span className="inline-flex rounded-[20px] bg-[#DBEAFE] px-2.5 py-1 text-[12px] font-medium text-[#1E40AF]">
        Руководитель
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-[20px] bg-[var(--color-bg-surface-2)] px-2.5 py-1 text-[12px] font-medium text-[var(--color-text-secondary)]">
      Менеджер
    </span>
  );
}

function StatusCell({ isBlocked }: { isBlocked: boolean }): ReactNode {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${!isBlocked ? 'bg-[#10B981]' : 'bg-[#94A3B8]'}`}
        aria-hidden="true"
      />
      <span
        className={`text-[13px] ${!isBlocked ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'}`}
      >
        {!isBlocked ? 'Активен' : 'Заблокирован'}
      </span>
    </div>
  );
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function mapApiUserToUser(user: ApiUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isBlocked: user.isBlocked,
    avatarUrl: user.avatarUrl,
    createdAt: new Date(user.createdAt).toLocaleDateString('ru-RU'),
  };
}

const TABLE_COLUMNS = [
  'ПОЛЬЗОВАТЕЛЬ',
  'EMAIL',
  'РОЛЬ',
  'СТАТУС',
  'ДАТА СОЗДАНИЯ',
  'ДЕЙСТВИЯ',
] as const;

export default function UsersTable(props: UsersTableProps): ReactNode {
  const [users, setUsers] = useState<User[]>(() => props.initialUsers.map(mapApiUserToUser));
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  async function refetch(): Promise<void> {
    const res = await fetch('/api/users');
    if (!res.ok) return;
    const data = (await res.json()) as ApiUser[];
    setUsers(data.map(mapApiUserToUser));
  }

  async function handleToggleBlock(user: User): Promise<void> {
    const res = await fetch(`/api/users/${user.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBlocked: !user.isBlocked }),
    });

    if (res.ok) {
      await refetch();
      return;
    }

    const data = (await res.json()) as { error?: string };
    if (data.error === 'LAST_ADMIN') {
      setToast('Нельзя заблокировать последнего администратора компании');
    } else {
      setToast('Произошла ошибка. Попробуйте ещё раз');
    }
  }

  async function handleAddSuccess(): Promise<void> {
    await refetch();
    setIsAddOpen(false);
    setToast('Пользователь создан');
  }

  async function handleEditSuccess(): Promise<void> {
    await refetch();
    setEditUser(null);
    setToast('Пользователь обновлён');
  }

  async function handleDeleteSuccess(): Promise<void> {
    await refetch();
    setDeleteUser(null);
    setToast('Пользователь удалён');
  }

  return (
    <>
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[28px] font-medium tracking-[-0.01em] text-[var(--color-text-primary)]">
          Пользователи
        </h1>
        <Button
          size="md"
          type="button"
          onClick={() => setIsAddOpen(true)}
          icon={<Icon icon="tabler:plus" className="h-4 w-4" />}
          className="w-full whitespace-nowrap sm:w-auto"
        >
          Добавить пользователя
        </Button>
      </div>

      {/* Десктоп (≥ lg): таблица */}
      <div className="hidden overflow-hidden rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse">
            <thead>
              <tr className="border-b-[0.5px] border-[var(--color-border)]">
                {TABLE_COLUMNS.map((column) => (
                  <th
                    key={column}
                    className="px-4 py-3 text-left text-[11px] font-medium tracking-[0.05em] text-[var(--color-text-secondary)] uppercase"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={TABLE_COLUMNS.length}
                    className="px-4 py-8 text-center text-[14px] text-[var(--color-text-secondary)]"
                  >
                    Нет пользователей
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const isSelf = user.id === props.currentUserId;
                  return (
                    <tr
                      key={user.id}
                      className="border-b-[0.5px] border-[var(--color-border)] last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar
                            initials={getInitials(user.name)}
                            src={user.avatarUrl ?? undefined}
                            size="md"
                          />
                          <span className="text-[14px] font-medium text-[var(--color-text-primary)]">
                            {user.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
                        {user.email}
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={user.role} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusCell isBlocked={user.isBlocked} />
                      </td>
                      <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
                        {user.createdAt}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <IconButton
                            size="sm"
                            disabled={isSelf}
                            onClick={() => setEditUser(user)}
                            aria-label={`Редактировать ${user.name}`}
                            icon={<Icon icon="tabler:edit" className="h-4 w-4" />}
                          />
                          <IconButton
                            size="sm"
                            disabled={isSelf}
                            onClick={() => handleToggleBlock(user)}
                            aria-label={
                              !user.isBlocked
                                ? `Заблокировать ${user.name}`
                                : `Разблокировать ${user.name}`
                            }
                            icon={
                              <Icon
                                icon={!user.isBlocked ? 'tabler:ban' : 'tabler:circle-check'}
                                className="h-4 w-4"
                              />
                            }
                          />
                          <IconButton
                            size="sm"
                            disabled={isSelf}
                            onClick={() => setDeleteUser(user)}
                            aria-label={`Удалить ${user.name}`}
                            icon={<Icon icon="tabler:trash" className="h-4 w-4" />}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Мобильные/планшет (< lg): карточки вместо таблицы с прокруткой */}
      {users.length === 0 ? (
        <div className="rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-8 text-center text-[14px] text-[var(--color-text-secondary)] lg:hidden">
          Нет пользователей
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
          {users.map((user) => {
            const isSelf = user.id === props.currentUserId;
            return (
              <div
                key={user.id}
                className="rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    initials={getInitials(user.name)}
                    src={user.avatarUrl ?? undefined}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-[var(--color-text-primary)]">
                      {user.name}
                    </p>
                    <p className="truncate text-[13px] text-[var(--color-text-secondary)]">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
                  <RoleBadge role={user.role} />
                  <StatusCell isBlocked={user.isBlocked} />
                </div>

                <div className="mt-3 flex items-center justify-between border-t-[0.5px] border-[var(--color-border)] pt-3">
                  <span className="text-[12px] text-[var(--color-text-secondary)]">
                    Создан {user.createdAt}
                  </span>
                  <div className="flex items-center gap-2">
                    <IconButton
                      size="sm"
                      disabled={isSelf}
                      onClick={() => setEditUser(user)}
                      aria-label={`Редактировать ${user.name}`}
                      icon={<Icon icon="tabler:edit" className="h-4 w-4" />}
                    />
                    <IconButton
                      size="sm"
                      disabled={isSelf}
                      onClick={() => handleToggleBlock(user)}
                      aria-label={
                        !user.isBlocked
                          ? `Заблокировать ${user.name}`
                          : `Разблокировать ${user.name}`
                      }
                      icon={
                        <Icon
                          icon={!user.isBlocked ? 'tabler:ban' : 'tabler:circle-check'}
                          className="h-4 w-4"
                        />
                      }
                    />
                    <IconButton
                      size="sm"
                      disabled={isSelf}
                      onClick={() => setDeleteUser(user)}
                      aria-label={`Удалить ${user.name}`}
                      icon={<Icon icon="tabler:trash" className="h-4 w-4" />}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isAddOpen && (
        <AddUserModal onClose={() => setIsAddOpen(false)} onSuccess={handleAddSuccess} />
      )}

      {editUser && (
        <EditUserModal
          user={{
            id: editUser.id,
            name: editUser.name,
            email: editUser.email,
            role: editUser.role,
            status: editUser.isBlocked ? 'blocked' : ('active' as UserStatus),
          }}
          onClose={() => setEditUser(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deleteUser && (
        <DeleteUserModal
          user={{
            id: deleteUser.id,
            name: deleteUser.name,
            email: deleteUser.email,
            initials: getInitials(deleteUser.name),
          }}
          onClose={() => setDeleteUser(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}

      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </>
  );
}
