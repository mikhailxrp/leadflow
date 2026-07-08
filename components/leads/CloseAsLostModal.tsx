'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

interface LossReason {
  id: string;
  label: string;
}

interface CloseAsLostModalProps {
  leadId: string;
  onClose: () => void;
}

export default function CloseAsLostModal({ leadId, onClose }: CloseAsLostModalProps) {
  const router = useRouter();
  const [reasons, setReasons] = useState<LossReason[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/loss-reasons')
      .then((r) => r.json())
      .then((data: LossReason[]) => {
        setReasons(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    if (!selectedId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closeType: 'LOST', lossReasonId: selectedId }),
      });
      if (!res.ok) {
        setError('Не удалось закрыть лид');
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError('Ошибка сети');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-[360px] rounded-[12px] border border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 shadow-lg">
        <h2 className="mb-4 text-[15px] font-semibold text-[var(--color-text-primary)]">
          Закрыть отказом
        </h2>

        {loading ? (
          <p className="text-[13px] text-[var(--color-text-tertiary)]">Загрузка...</p>
        ) : (
          <div className="mb-5 flex flex-col gap-1.5">
            <label
              htmlFor="loss-reason-select"
              className="text-[12px] font-normal text-[var(--color-text-secondary)]"
            >
              Причина отказа
            </label>
            <select
              id="loss-reason-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="
                h-[36px] w-full appearance-none rounded-[6px]
                border border-[0.5px] border-[var(--color-border)]
                bg-[var(--color-bg-surface-2)] px-3
                text-[13px] text-[var(--color-text-primary)]
                outline-none
              "
            >
              <option value="">— Выберите причину —</option>
              {reasons.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <p className="mb-3 text-[12px] text-[var(--color-badge-danger-text)]">{error}</p>
        )}

        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={onClose}
            disabled={submitting}
          >
            Отмена
          </Button>
          <Button
            variant="danger"
            size="md"
            className="flex-1"
            onClick={handleSubmit}
            disabled={!selectedId || submitting}
          >
            {submitting ? 'Закрытие...' : 'Закрыть'}
          </Button>
        </div>
      </div>
    </div>
  );
}
