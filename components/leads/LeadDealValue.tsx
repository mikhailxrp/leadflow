'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Toast from '@/components/ui/Toast';

interface LeadDealValueProps {
  leadId: string;
  value: number | null;
}

const CURRENCY_FORMATTER = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 2,
});

function formatValue(value: number | null): string {
  return value === null ? '—' : `${CURRENCY_FORMATTER.format(value)} ₽`;
}

export default function LeadDealValue({ leadId, value }: LeadDealValueProps): ReactNode {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function startEditing(): void {
    setAmount(value === null ? '' : String(value));
    setEditing(true);
  }

  function cancelEditing(): void {
    setEditing(false);
  }

  async function handleSave(): Promise<void> {
    const trimmed = amount.trim();
    const next = trimmed === '' ? null : Number(trimmed.replace(',', '.'));

    if (next !== null && (!Number.isFinite(next) || next < 0)) {
      setToast('Введите корректную сумму');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/deal-value`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealValueEstimated: next }),
      });

      if (!res.ok) {
        setToast('Не удалось сохранить сумму');
        return;
      }

      setEditing(false);
      router.refresh();
    } catch {
      setToast('Ошибка сети');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12px] font-normal text-[var(--color-text-secondary)]">
        Сумма сделки (в работе)
      </span>

      {editing ? (
        <div className="flex flex-col gap-2">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={cancelEditing}
              disabled={saving}
            >
              Отмена
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={startEditing}
          className="w-fit text-left text-[13px] text-[var(--color-text-primary)] hover:underline"
        >
          {formatValue(value)}
        </button>
      )}

      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
