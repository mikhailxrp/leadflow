'use client';

import { useState, type ReactNode } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Avatar from '@/components/ui/Avatar';
import { ModalHeader } from '@/components/users/userModalShared';

export interface DeleteUserModalProps {
  user: { id: string; name: string; email: string; initials: string };
  onSuccess: () => void;
  onClose: () => void;
}

export default function DeleteUserModal({
  user,
  onSuccess,
  onClose,
}: DeleteUserModalProps): ReactNode {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(): Promise<void> {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' });

      if (res.ok) {
        onSuccess();
        onClose();
        return;
      }

      const data = (await res.json()) as { error?: string };
      if (data.error === 'USER_HAS_DATA') {
        setError('У пользователя есть данные. Заблокируйте вместо удаления');
      } else if (data.error === 'LAST_ADMIN') {
        setError('Нельзя удалить последнего администратора компании');
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
      <ModalHeader title="Удаление пользователя" onClose={onClose} />

      <div className="mt-5">
        <Avatar initials={user.initials} className="mx-auto h-12 w-12 text-[14px]" />

        <p className="mt-3 text-center text-[15px] font-medium text-[var(--color-text-primary)]">
          {user.name}
        </p>
        <p className="mt-1 text-center text-[13px] text-[var(--color-text-secondary)]">
          {user.email}
        </p>

        <p className="mt-4 text-center text-[13px] text-[var(--color-text-secondary)]">
          Пользователь будет удалён без возможности восстановления.
        </p>

        {error && <p className="mt-3 text-center text-[13px] text-[#EF4444]">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" size="md" type="button" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button
            variant="primary"
            size="md"
            type="button"
            className="border-transparent bg-[#EF4444] text-white hover:bg-[#DC2626]"
            disabled={loading}
            onClick={handleConfirm}
          >
            {loading ? 'Удаление…' : 'Удалить'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
