'use client';

import { useState } from 'react';
import Toggle from '@/components/settings/Toggle';
import TelegramBindButton from '@/components/notifications/TelegramBindButton';
import ProfileRow from '@/components/profile/ProfileRow';
import ProfileSectionCard from '@/components/profile/ProfileSectionCard';
import type { NotificationPreferences } from '@/types/users';

interface ProfileNotificationsProps {
  initialPreferences: NotificationPreferences;
  telegramConnected: boolean;
}

// Профиль показывает только операционные переключатели самого пользователя;
// управленческие ключи (reactionReminder/managementAlerts, Phase 17) сюда не входят —
// список умышленно не выводится из keyof NotificationPreferences целиком.
const PROFILE_PREFERENCE_KEYS = ['assignedLead', 'commentOnLead', 'reminders'] as const;

type PreferenceKey = (typeof PROFILE_PREFERENCE_KEYS)[number];

const PREFERENCE_LABELS: Record<PreferenceKey, string> = {
  assignedLead: 'Новый лид назначен на меня',
  commentOnLead: 'Комментарий к моему лиду',
  reminders: 'Напоминания',
};

export default function ProfileNotifications({
  initialPreferences,
  telegramConnected,
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
      {PROFILE_PREFERENCE_KEYS.map((key) => (
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

      <ProfileRow label="Telegram-бот">
        <div className="flex flex-1 justify-end">
          <TelegramBindButton connected={telegramConnected} />
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
