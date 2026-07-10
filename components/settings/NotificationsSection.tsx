'use client';

import { useState, type ReactNode } from 'react';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsRow from '@/components/settings/SettingsRow';
import Toggle from '@/components/settings/Toggle';
import Toast from '@/components/ui/Toast';

interface NotificationsSectionProps {
  initialTelegramEnabled: boolean;
}

export default function NotificationsSection({
  initialTelegramEnabled,
}: NotificationsSectionProps): ReactNode {
  const [telegramEnabled, setTelegramEnabled] = useState(initialTelegramEnabled);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function handleToggle(checked: boolean): Promise<void> {
    if (saving) return;

    const previous = telegramEnabled;
    setTelegramEnabled(checked);
    setSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramEnabled: checked }),
      });

      if (!res.ok) {
        setTelegramEnabled(previous);
        setToast('Не удалось сохранить настройку');
        return;
      }

      setToast('Настройка сохранена');
    } catch {
      setTelegramEnabled(previous);
      setToast('Не удалось сохранить настройку');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard icon="tabler:bell" title="Уведомления">
      <SettingsRow label="Telegram-уведомления для компании">
        <Toggle
          checked={telegramEnabled}
          disabled={saving}
          onChange={handleToggle}
          aria-label="Telegram-уведомления для компании"
        />
      </SettingsRow>

      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </SettingsCard>
  );
}
