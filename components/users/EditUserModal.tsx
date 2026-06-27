'use client';

import { useState, type ReactNode } from 'react';
import type { UserRole as PrismaUserRole } from '@prisma/client';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import StatusRadioGroup, {
  RoleRadioGroup,
  ModalHeader,
  disabledInputClass,
  type UserStatus,
} from '@/components/users/userModalShared';

export interface EditUserModalProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: PrismaUserRole;
    status: UserStatus;
  };
  onSuccess: () => void;
  onClose: () => void;
}

export default function EditUserModal({ user, onSuccess, onClose }: EditUserModalProps): ReactNode {
  const [role, setRole] = useState<PrismaUserRole>(user.role);
  const [status, setStatus] = useState<UserStatus>(user.status);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isChanged = role !== user.role || status !== user.status;

  async function handleConfirm(): Promise<void> {
    if (!isChanged || loading) return;

    const payload: { role?: PrismaUserRole; isBlocked?: boolean } = {};
    if (role !== user.role) payload.role = role;
    if (status !== user.status) payload.isBlocked = status === 'blocked';

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        onSuccess();
        onClose();
        return;
      }

      const data = (await res.json()) as { error?: string };
      if (data.error === 'LAST_ADMIN') {
        setError('Нельзя понизить или заблокировать последнего администратора компании');
      } else {
        setError('Произошла ошибка. Попробуйте ещё раз');
      }
    } catch {
      setError('Произошла ошибка. Попробуйте ещё раз');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} dialogClassName="max-w-[420px]">
      <ModalHeader title="Редактирование пользователя" onClose={onClose} />

      <div className="mt-5 flex flex-col gap-4">
        <Input label="Имя" value={user.name} disabled className={disabledInputClass} />

        <Input
          label="Email"
          type="email"
          value={user.email}
          disabled
          className={disabledInputClass}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]">
            Роль
          </span>
          <RoleRadioGroup value={role} onChange={setRole} name="edit-user-role" />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]">
            Статус
          </span>
          <StatusRadioGroup value={status} onChange={setStatus} name="edit-user-status" />
        </div>

        {error && <p className="text-[13px] text-[#EF4444]">{error}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button variant="secondary" size="md" type="button" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button
            variant="primary"
            size="md"
            type="button"
            disabled={!isChanged || loading}
            onClick={handleConfirm}
          >
            {loading ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
