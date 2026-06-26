'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserRole } from '@prisma/client';
import { hasMinRole } from '@/constants/roles';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface DeleteLeadModalProps {
  leadId: string;
  leadName: string | null;
  role: UserRole;
}

export default function DeleteLeadModal({ leadId, leadName, role }: DeleteLeadModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasMinRole(role, 'ADMIN')) {
    return null;
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
      if (!res.ok) {
        setError('Не удалось удалить лид');
        setLoading(false);
        return;
      }
      router.push('/leads');
    } catch {
      setError('Ошибка сети');
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="danger" size="md" onClick={() => setOpen(true)}>
        Удалить лид
      </Button>

      {open && (
        <Modal onClose={() => { if (!loading) setOpen(false); }}>
          <h2 className="mb-2 text-[16px] font-semibold text-[var(--color-text-primary)]">
            Удалить лид?
          </h2>
          <p className="mb-6 text-[13px] text-[var(--color-text-secondary)]">
            Лид{leadName ? ` «${leadName}»` : ''} будет удалён без возможности
            восстановления. Все связанные события и комментарии будут удалены.
          </p>

          {error && (
            <p className="mb-4 text-[12px] text-[var(--color-badge-danger-text)]">{error}</p>
          )}

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              size="md"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button variant="danger" size="md" onClick={handleDelete} disabled={loading}>
              {loading ? 'Удаление...' : 'Удалить'}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
