'use client';

import { type ReactNode } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { ModalHeader } from '@/components/users/userModalShared';

export interface DeleteUserModalProps {
  user: { id: string; name: string; email: string; initials: string };
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteUserModal({
  user,
  onConfirm,
  onClose,
}: DeleteUserModalProps): ReactNode {
  function handleConfirm(): void {
    // TODO: удаление пользователя через API
    console.log('Delete user', { id: user.id });
    onConfirm();
  }

  return (
    <Modal onClose={onClose} dialogClassName="max-w-[420px]">
      <ModalHeader title="Удаление пользователя" onClose={onClose} />

      <div className="mt-5">
        <Avatar
          initials={user.initials}
          className="mx-auto h-12 w-12 text-[14px]"
        />

        <p className="mt-3 text-center text-[15px] font-medium text-[var(--color-text-primary)]">
          {user.name}
        </p>
        <p className="mt-1 text-center text-[13px] text-[var(--color-text-secondary)]">
          {user.email}
        </p>

        <p className="mt-4 text-center text-[13px] text-[var(--color-text-secondary)]">
          Пользователь будет удалён без возможности восстановления.
          <br />
          Все назначенные ему лиды останутся без менеджера.
        </p>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" size="md" type="button" onClick={onClose}>
            Отмена
          </Button>
          <Button
            variant="primary"
            size="md"
            type="button"
            className="border-transparent bg-[#EF4444] text-white hover:bg-[#DC2626]"
            onClick={handleConfirm}
          >
            Удалить
          </Button>
        </div>
      </div>
    </Modal>
  );
}
