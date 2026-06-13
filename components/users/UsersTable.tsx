'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Avatar from '@/components/ui/Avatar';
import AddUserModal from '@/components/users/AddUserModal';
import DeleteUserModal from '@/components/users/DeleteUserModal';
import EditUserModal from '@/components/users/EditUserModal';
import type { UserStatus } from '@/components/users/userModalShared';

export type UserRole = 'admin' | 'manager';

export interface User {
  id: string;
  initials: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

const MOCK_USERS: User[] = [
  {
    id: '1',
    initials: 'АС',
    name: 'Алексей Смирнов',
    email: 'a.smirnov@example.com',
    role: 'admin',
    status: 'active',
    createdAt: '12.10.2023',
  },
  {
    id: '2',
    initials: 'ЕИ',
    name: 'Елена Иванова',
    email: 'e.ivanova@example.com',
    role: 'manager',
    status: 'active',
    createdAt: '15.10.2023',
  },
  {
    id: '3',
    initials: 'ДС',
    name: 'Дмитрий Соколов',
    email: 'd.sokolov@example.com',
    role: 'manager',
    status: 'blocked',
    createdAt: '02.11.2023',
  },
  {
    id: '4',
    initials: 'ОК',
    name: 'Ольга Кузнецова',
    email: 'o.kuznetsova@example.com',
    role: 'manager',
    status: 'active',
    createdAt: '10.11.2023',
  },
  {
    id: '5',
    initials: 'ИП',
    name: 'Иван Попов',
    email: 'i.popov@example.com',
    role: 'manager',
    status: 'active',
    createdAt: '20.11.2023',
  },
];

function getRoleLabel(role: UserRole): string {
  return role === 'admin' ? 'Администратор' : 'Менеджер';
}

function RoleBadge({ role }: { role: UserRole }): ReactNode {
  if (role === 'admin') {
    return (
      <span className="inline-flex rounded-[20px] bg-[#D1FAE5] px-2.5 py-1 text-[12px] font-medium text-[#065F46]">
        Администратор
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-[20px] bg-[var(--color-bg-surface-2)] px-2.5 py-1 text-[12px] font-medium text-[var(--color-text-secondary)]">
      Менеджер
    </span>
  );
}

function StatusCell({ status }: { status: UserStatus }): ReactNode {
  const isActive = status === 'active';

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${isActive ? 'bg-[#10B981]' : 'bg-[#94A3B8]'}`}
        aria-hidden="true"
      />
      <span
        className={`text-[13px] ${isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'}`}
      >
        {isActive ? 'Активен' : 'Заблокирован'}
      </span>
    </div>
  );
}

const TABLE_COLUMNS = [
  'ПОЛЬЗОВАТЕЛЬ',
  'EMAIL',
  'РОЛЬ',
  'СТАТУС',
  'ДАТА СОЗДАНИЯ',
  'ДЕЙСТВИЯ',
] as const;

export default function UsersTable(): ReactNode {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);

  function handleToggleBlock(user: User): void {
    // TODO: блокировка через API
    console.log('Toggle block', { id: user.id, status: user.status === 'active' ? 'blocked' : 'active' });
    setUsers((prev) =>
      prev.map((item) =>
        item.id === user.id
          ? { ...item, status: item.status === 'active' ? 'blocked' : 'active' }
          : item,
      ),
    );
  }

  function handleAddConfirm(data: {
    name: string;
    email: string;
    password: string;
    status: UserStatus;
  }): void {
    const initials = data.name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    setUsers((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        initials,
        name: data.name,
        email: data.email,
        role: 'manager',
        status: data.status,
        createdAt: new Date().toLocaleDateString('ru-RU'),
      },
    ]);
    setIsAddOpen(false);
  }

  function handleEditConfirm(status: UserStatus): void {
    if (!editUser) return;

    setUsers((prev) =>
      prev.map((item) => (item.id === editUser.id ? { ...item, status } : item)),
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
          ＋ Добавить менеджера
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
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b-[0.5px] border-[var(--color-border)] last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar initials={user.initials} size="md" />
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
                    <StatusCell status={user.status} />
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
                        aria-label={user.status === 'active' ? `Заблокировать ${user.name}` : `Разблокировать ${user.name}`}
                        icon={
                          <Icon
                            icon={user.status === 'active' ? 'tabler:ban' : 'tabler:circle-check'}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddOpen && (
        <AddUserModal onClose={() => setIsAddOpen(false)} onConfirm={handleAddConfirm} />
      )}

      {editUser && (
        <EditUserModal
          user={{
            id: editUser.id,
            name: editUser.name,
            email: editUser.email,
            role: getRoleLabel(editUser.role),
            status: editUser.status,
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
            initials: deleteUser.initials,
          }}
          onClose={() => setDeleteUser(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </>
  );
}
