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
  createdAt: string;
}

function getRoleLabel(role: PrismaUserRole): string {
  if (role === 'ADMIN') return 'Администратор';
  if (role === 'HEAD') return 'Руководитель';
  return 'Менеджер';
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

  function handleToggleBlock(user: User): void {
    setUsers((prev) =>
      prev.map((item) =>
        item.id === user.id ? { ...item, isBlocked: !item.isBlocked } : item,
      ),
    );
  }

  async function handleAddSuccess(): Promise<void> {
    await refetch();
    setIsAddOpen(false);
    setToast('Пользователь создан');
  }

  function handleEditConfirm(status: UserStatus): void {
    if (!editUser) return;
    setUsers((prev) =>
      prev.map((item) =>
        item.id === editUser.id ? { ...item, isBlocked: status === 'blocked' } : item,
      ),
    );
    setEditUser(null);
  }

  function handleDeleteConfirm(): void {
    if (!deleteUser) return;
    setUsers((prev) => prev.filter((item) => item.id !== deleteUser.id));
    setDeleteUser(null);
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[28px] font-medium tracking-[-0.01em] text-[var(--color-text-primary)]">
          Пользователи
        </h1>
        <Button size="md" type="button" onClick={() => setIsAddOpen(true)}>
          ＋ Добавить пользователя
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)]">
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
                users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b-[0.5px] border-[var(--color-border)] last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar initials={getInitials(user.name)} size="md" />
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
                          onClick={() => setEditUser(user)}
                          aria-label={`Редактировать ${user.name}`}
                          icon={<Icon icon="tabler:edit" className="h-4 w-4" />}
                        />
                        <IconButton
                          size="sm"
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
                          onClick={() => setDeleteUser(user)}
                          aria-label={`Удалить ${user.name}`}
                          icon={<Icon icon="tabler:trash" className="h-4 w-4" />}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddOpen && (
        <AddUserModal onClose={() => setIsAddOpen(false)} onSuccess={handleAddSuccess} />
      )}

      {editUser && (
        <EditUserModal
          user={{
            id: editUser.id,
            name: editUser.name,
            email: editUser.email,
            role: getRoleLabel(editUser.role),
            status: editUser.isBlocked ? 'blocked' : 'active',
          }}
          onClose={() => setEditUser(null)}
          onConfirm={handleEditConfirm}
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
          onConfirm={handleDeleteConfirm}
        />
      )}

      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </>
  );
}
