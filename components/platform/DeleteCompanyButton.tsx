'use client';

import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';

interface DeleteCompanyButtonProps {
  companyId: string;
  companyName: string;
}

export default function DeleteCompanyButton({
  companyId,
  companyName,
}: DeleteCompanyButtonProps): ReactNode {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canDelete = confirmText.trim() === companyName.trim();

  function handleClose(): void {
    if (loading) return;
    setIsOpen(false);
    setConfirmText('');
    setError(null);
  }

  async function handleConfirm(): Promise<void> {
    if (!canDelete || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/platform/companies/${companyId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/platform/companies');
        router.refresh();
        return;
      }

      const data = (await res.json()) as { error?: string };
      if (data.error === 'COMPANY_NOT_BLOCKED') {
        setError('Удалить можно только заблокированную компанию');
      } else if (data.error === 'Forbidden') {
        setError('Недостаточно прав для удаления этой компании');
      } else {
        setError('Не удалось удалить компанию. Попробуйте ещё раз');
      }
      setLoading(false);
    } catch {
      setError('Не удалось удалить компанию. Попробуйте ещё раз');
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setIsOpen(true)}>
        Удалить компанию
      </Button>

      {isOpen ? (
        <Modal onClose={handleClose} dialogClassName="max-w-[440px]">
          <h2 className="text-[18px] font-medium text-[var(--color-text-primary)]">
            Удаление компании
          </h2>

          <p className="mt-3 text-[13px] leading-5 text-[var(--color-text-secondary)]">
            Все данные компании{' '}
            <strong className="text-[var(--color-text-primary)]">
              {companyName}
            </strong>{' '}
            — лиды, пользователи, воронка, задачи, история и интеграции — будут
            удалены без возможности восстановления. Приём новых лидов прекратится.
          </p>

          <p className="mt-4 text-[13px] text-[var(--color-text-secondary)]">
            Для подтверждения введите название компании:
          </p>

          <div className="mt-2">
            <Input
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              placeholder={companyName}
              autoFocus
              disabled={loading}
            />
          </div>

          {error ? (
            <p className="mt-3 text-[13px] text-[#EF4444]" role="alert">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="secondary"
              size="md"
              type="button"
              onClick={handleClose}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              size="md"
              type="button"
              className="border-transparent bg-[#EF4444] text-white hover:bg-[#DC2626] disabled:opacity-60"
              disabled={!canDelete || loading}
              onClick={handleConfirm}
            >
              {loading ? 'Удаление…' : 'Удалить навсегда'}
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
