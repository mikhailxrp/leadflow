'use client';

import { useState, type ReactNode } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import StatusRadioGroup, {
  ModalHeader,
  disabledInputClass,
  type UserStatus,
} from '@/components/users/userModalShared';

export interface EditUserModalProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: UserStatus;
  };
  onConfirm: (status: UserStatus) => void;
  onClose: () => void;
}

export default function EditUserModal({ user, onConfirm, onClose }: EditUserModalProps): ReactNode {
  const [status, setStatus] = useState<UserStatus>(user.status);

  const isChanged = status !== user.status;

  function handleConfirm(): void {
    if (!isChanged) return;

    // TODO: обновление статуса через API
    console.log('Edit user status', { id: user.id, status });
    onConfirm(status);
  }

  return (
    <Modal onClose={onClose} dialogClassName="max-w-[420px]">
      <ModalHeader title="Редактирование пользователя" onClose={onClose} />

      <div className="mt-5 flex flex-col gap-4">
        <Input
          label="Имя"
          value={user.name}
          disabled
          className={disabledInputClass}
        />

        <Input
          label="Email"
          type="email"
          value={user.email}
          disabled
          className={disabledInputClass}
        />

        <Input
          label="Роль"
          value={user.role}
          disabled
          className={disabledInputClass}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]">
            Статус
          </span>
          <StatusRadioGroup value={status} onChange={setStatus} name="edit-user-status" />
          <span className="text-[11px] text-[var(--color-text-tertiary)]">
            Только статус доступен для изменения
          </span>
        </div>

        <div className="mt-2 flex justify-end gap-3">
          <Button variant="secondary" size="md" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="primary"
            size="md"
            type="button"
            disabled={!isChanged}
            onClick={handleConfirm}
          >
            Сохранить
          </Button>
        </div>
      </div>
    </Modal>
  );
}
