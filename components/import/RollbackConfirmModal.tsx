'use client';

import { useState, type ReactNode } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { ModalHeader } from '@/components/users/userModalShared';
import type { ImportHistoryItem } from '@/types/import';

export interface RollbackConfirmModalProps {
  batch: ImportHistoryItem;
  onSuccess: (batchId: string) => void;
  onClose: () => void;
}

export default function RollbackConfirmModal({
  batch,
  onSuccess,
  onClose,
}: RollbackConfirmModalProps): ReactNode {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm(): Promise<void> {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/import/${batch.id}/rollback`, { method: 'POST' });

      if (res.ok) {
        onSuccess(batch.id);
        return;
      }

      const data = (await res.json()) as { error?: string };
      if (data.error === 'IMPORT_NOT_ROLLBACKABLE') {
        setError('Импорт уже отменён или ещё не завершён');
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
    <Modal onClose={onClose} dialogClassName="max-w-[440px]">
      <ModalHeader title="Откат импорта" onClose={onClose} />

      <div className="mt-5">
        <p className="text-[14px] text-[var(--color-text-primary)]">{batch.fileName}</p>

        <p className="mt-3 text-[13px] text-[var(--color-text-secondary)]">
          Будет удалено {batch.imported} {pluralizeLeads(batch.imported)}, включая те, с которыми
          уже велась работа. Действие необратимо.
        </p>

        {error && <p className="mt-3 text-[13px] text-[#EF4444]">{error}</p>}

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
            {loading ? 'Откат…' : 'Откатить импорт'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function pluralizeLeads(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'лид';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'лида';
  return 'лидов';
}
