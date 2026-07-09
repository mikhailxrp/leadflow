'use client';

import { useState } from 'react';
import Toggle from '@/components/settings/Toggle';
import ProfileRow from '@/components/profile/ProfileRow';
import ProfileSectionCard from '@/components/profile/ProfileSectionCard';
import type { NotificationPreferences } from '@/types/users';

interface ProfileNotificationsProps {
  initialPreferences: NotificationPreferences;
}

type PreferenceKey = keyof NotificationPreferences;

const PREFERENCE_LABELS: Record<PreferenceKey, string> = {
  assignedLead: 'Новый лид назначен на меня',
  commentOnLead: 'Комментарий к моему лиду',
  reminders: 'Напоминания',
};

export default function ProfileNotifications({
  initialPreferences,
}: ProfileNotificationsProps) {
  const [preferences, setPreferences] = useState(initialPreferences);
  const [pendingKey, setPendingKey] = useState<PreferenceKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(key: PreferenceKey, checked: boolean): Promise<void> {
    const previous = preferences;
    setPreferences((prev) => ({ ...prev, [key]: checked }));
    setPendingKey(key);
    setError(null);

    try {
      const response = await fetch('/api/users/me/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: checked }),
      });

      if (!response.ok) {
        throw new Error('Failed to update notification preferences');
      }
    } catch (err) {
      console.error(err);
      setPreferences(previous);
      setError('Не удалось сохранить настройку');
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <ProfileSectionCard
      icon="tabler:bell"
      title="Мои уведомления"
      subtitle="Персональные настройки, перекрывают общие"
    >
      {(Object.keys(PREFERENCE_LABELS) as PreferenceKey[]).map((key) => (
        <ProfileRow key={key} label={PREFERENCE_LABELS[key]}>
          <div className="flex flex-1 justify-end">
            <Toggle
              checked={preferences[key]}
              disabled={pendingKey === key}
              onChange={(checked) => handleToggle(key, checked)}
              aria-label={PREFERENCE_LABELS[key]}
            />
          </div>
        </ProfileRow>
      ))}

      <ProfileRow label="Уведомления в Telegram">
        <div className="flex flex-1 items-center justify-end gap-3">
          <span className="text-[11px] text-[var(--color-text-tertiary)]">
            Появится после подключения Telegram-бота
          </span>
          <Toggle checked={false} disabled onChange={() => undefined} aria-label="Уведомления в Telegram" />
        </div>
      </ProfileRow>

      {error && (
        <p className="px-6 py-2 text-[12px] text-[#DC2626]" role="alert">
          {error}
        </p>
      )}
    </ProfileSectionCard>
  );
}
