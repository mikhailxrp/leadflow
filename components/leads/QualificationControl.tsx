'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { LeadQualification } from '@prisma/client';
import Toast from '@/components/ui/Toast';

interface QualificationControlProps {
  leadId: string;
  qualification: LeadQualification | null;
}

const OPTIONS: Array<{ value: LeadQualification; label: string }> = [
  { value: 'QUALIFIED', label: 'Целевой' },
  { value: 'DISQUALIFIED', label: 'Нецелевой' },
];

export default function QualificationControl({
  leadId,
  qualification,
}: QualificationControlProps): ReactNode {
  const router = useRouter();
  const [value, setValue] = useState(qualification);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Синхронизация со свежим `qualification` после router.refresh() — без эффекта,
  // сравниваем с последним увиденным пропом, а не с оптимистичным `value`
  // (иначе не отличить «проп ещё не подтянулся» от «идёт оптимистичное обновление»).
  const [syncedQualification, setSyncedQualification] = useState(qualification);
  if (qualification !== syncedQualification) {
    setSyncedQualification(qualification);
    setValue(qualification);
  }

  async function updateQualification(next: LeadQualification | null): Promise<void> {
    if (next === value || saving) return;

    const previous = value;
    setValue(next);
    setSaving(true);

    try {
      const res = await fetch(`/api/leads/${leadId}/qualification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qualification: next }),
      });

      if (!res.ok) {
        setValue(previous);
        setToast('Не удалось изменить квалификацию');
        return;
      }

      router.refresh();
    } catch {
      setValue(previous);
      setToast('Не удалось изменить квалификацию');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={saving}
              onClick={() => updateQualification(option.value)}
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                active
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'bg-[var(--color-bg-surface-2)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-surface)]'
              }`}
            >
              {option.label}
            </button>
          );
        })}
        {value !== null && (
          <button
            type="button"
            disabled={saving}
            onClick={() => updateQualification(null)}
            className="text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Сбросить
          </button>
        )}
      </div>
      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </>
  );
}
