'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

interface TakeInWorkButtonProps {
  leadId: string;
  hasTakenInWork: boolean;
  takenAt: string | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TakeInWorkButton({
  leadId,
  hasTakenInWork,
  takenAt,
}: TakeInWorkButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hasTakenInWork) {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">
          Взято в работу
        </span>
        {takenAt && (
          <span className="text-[11px] text-[var(--color-text-tertiary)]">
            {formatTime(takenAt)}
          </span>
        )}
      </div>
    );
  }

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/take`, { method: 'POST' });
      if (!res.ok) {
        setError('Не удалось взять в работу');
        return;
      }
      router.refresh();
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="primary"
        size="md"
        className="w-full"
        disabled={loading}
        onClick={handleClick}
      >
        {loading ? 'Загрузка...' : 'Взять в работу'}
      </Button>
      {error && (
        <span className="text-[11px] text-[var(--color-badge-danger-text)]">{error}</span>
      )}
    </div>
  );
}
