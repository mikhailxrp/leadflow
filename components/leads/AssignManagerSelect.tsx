'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Select from '@/components/ui/Select';
import Toast from '@/components/ui/Toast';

interface ApiUserOption {
  id: string;
  name: string;
  isBlocked: boolean;
}

const UNASSIGNED = '__unassigned__';

interface AssignManagerSelectProps {
  leadId: string;
  assignedTo: { id: string; name: string } | null;
}

export default function AssignManagerSelect({
  leadId,
  assignedTo,
}: AssignManagerSelectProps): ReactNode {
  const router = useRouter();
  const [users, setUsers] = useState<ApiUserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [value, setValue] = useState(assignedTo?.id ?? UNASSIGNED);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Синхронизация со свежим `assignedTo` после router.refresh() (например, если
  // назначение поменяли из другого места) — без эффекта, по паттерну React
  // "adjusting state when a prop changes": сравнение и setState прямо в рендере.
  const [syncedAssignedId, setSyncedAssignedId] = useState(assignedTo?.id ?? UNASSIGNED);
  const currentAssignedId = assignedTo?.id ?? UNASSIGNED;
  if (currentAssignedId !== syncedAssignedId) {
    setSyncedAssignedId(currentAssignedId);
    setValue(currentAssignedId);
  }

  useEffect(() => {
    let cancelled = false;

    fetch('/api/users')
      .then((res) => (res.ok ? (res.json() as Promise<ApiUserOption[]>) : Promise.reject()))
      .then((data) => {
        if (!cancelled) setUsers(data);
      })
      .catch(() => {
        if (!cancelled) setToast('Не удалось загрузить список пользователей');
      })
      .finally(() => {
        if (!cancelled) setLoadingUsers(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Заблокированные — не валидный выбор для нового назначения, но текущий
  // ответственный должен остаться виден, даже если его заблокировали позже.
  const options = [
    { value: UNASSIGNED, label: 'Не назначен' },
    ...users
      .filter((user) => !user.isBlocked || user.id === assignedTo?.id)
      .map((user) => ({
        value: user.id,
        label: user.isBlocked ? `${user.name} (заблокирован)` : user.name,
      })),
  ];

  async function handleChange(next: string): Promise<void> {
    if (next === value || saving) return;

    const previous = value;
    setValue(next);
    setSaving(true);

    try {
      const res = await fetch(`/api/leads/${leadId}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ managerId: next === UNASSIGNED ? null : next }),
      });

      if (!res.ok) {
        setValue(previous);
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setToast(
          data.error === 'WRONG_COMPANY'
            ? 'Выбранный пользователь недоступен для назначения'
            : 'Не удалось изменить ответственного',
        );
        return;
      }

      setToast(next === UNASSIGNED ? 'Ответственный снят' : 'Ответственный назначен');
      router.refresh();
    } catch {
      setValue(previous);
      setToast('Не удалось изменить ответственного');
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
        disabled={loadingUsers || saving}
      />
      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </>
  );
}
