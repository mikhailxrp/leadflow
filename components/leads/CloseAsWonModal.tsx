'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface CloseAsWonModalProps {
  leadId: string;
  onClose: () => void;
}

export default function CloseAsWonModal({ leadId, onClose }: CloseAsWonModalProps) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = Number(amount.replace(',', '.'));
  const isValidAmount = amount.trim() !== '' && Number.isFinite(parsedAmount) && parsedAmount > 0;

  async function handleSubmit() {
    if (!isValidAmount) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ closeType: 'WON', dealValueFinal: parsedAmount }),
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
          Закрыть сделкой
        </h2>

        <div className="mb-5">
          <Input
            label="Сумма сделки, ₽"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoFocus
          />
        </div>

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
            variant="primary"
            size="md"
            className="flex-1"
            onClick={handleSubmit}
            disabled={!isValidAmount || submitting}
          >
            {submitting ? 'Закрытие...' : 'Закрыть'}
          </Button>
        </div>
      </div>
    </div>
  );
}
