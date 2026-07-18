'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Select from '@/components/ui/Select';
import Toast from '@/components/ui/Toast';

interface ApiStageOption {
  id: string;
  name: string;
  order: number;
}

interface StageSelectProps {
  leadId: string;
  currentStage: { id: string; name: string };
}

export default function StageSelect({
  leadId,
  currentStage,
}: StageSelectProps): ReactNode {
  const router = useRouter();
  // Стартуем с текущего этапа, чтобы селект показывал название до загрузки списка.
  const [stages, setStages] = useState<ApiStageOption[]>([
    { id: currentStage.id, name: currentStage.name, order: 0 },
  ]);
  const [loadingStages, setLoadingStages] = useState(true);
  const [value, setValue] = useState(currentStage.id);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Синхронизация со свежим `currentStage` после router.refresh() (например, если
  // этап поменяли перетаскиванием на доске) — по паттерну "adjusting state when a
  // prop changes": сравнение и setState прямо в рендере, без эффекта.
  const [syncedStageId, setSyncedStageId] = useState(currentStage.id);
  if (currentStage.id !== syncedStageId) {
    setSyncedStageId(currentStage.id);
    setValue(currentStage.id);
  }

  useEffect(() => {
    let cancelled = false;

    fetch('/api/stages')
      .then((res) => (res.ok ? (res.json() as Promise<ApiStageOption[]>) : Promise.reject()))
      .then((data) => {
        if (!cancelled) setStages(data);
      })
      .catch(() => {
        if (!cancelled) setToast('Не удалось загрузить список этапов');
      })
      .finally(() => {
        if (!cancelled) setLoadingStages(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const options = stages
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((stage) => ({ value: stage.id, label: stage.name }));

  async function handleChange(next: string): Promise<void> {
    if (next === value || saving) return;

    const previous = value;
    setValue(next);
    setSaving(true);

    try {
      const res = await fetch(`/api/leads/${leadId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: next }),
      });

      if (!res.ok) {
        setValue(previous);
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setToast(
          data.error === 'LEAD_CLOSED'
            ? 'Лид закрыт — смена этапа недоступна'
            : data.error === 'INVALID_STAGE'
              ? 'Выбранный этап недоступен'
              : 'Не удалось сменить этап',
        );
        return;
      }

      setToast('Этап изменён');
      router.refresh();
    } catch {
      setValue(previous);
      setToast('Не удалось сменить этап');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Select
        value={value}
        onChange={handleChange}
        options={options}
        disabled={loadingStages || saving}
      />
      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </>
  );
}
