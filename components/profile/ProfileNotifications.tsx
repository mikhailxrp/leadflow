'use client';

import { useEffect, useState } from 'react';
import Input from '@/components/ui/Input';
import Toggle from '@/components/settings/Toggle';
import ProfileRow from '@/components/profile/ProfileRow';
import ProfileSectionCard from '@/components/profile/ProfileSectionCard';

interface NotificationsState {
  assignedLead: boolean;
  commentOnLead: boolean;
  reminders: boolean;
  telegramEnabled: boolean;
  telegramChatId: string;
}

const INITIAL_STATE: NotificationsState = {
  assignedLead: true,
  commentOnLead: true,
  reminders: true,
  telegramEnabled: false,
  telegramChatId: '',
};

interface ProfileNotificationsProps {
  resetSignal: number;
  onDirtyChange: (dirty: boolean) => void;
}

function isStateDirty(state: NotificationsState): boolean {
  return JSON.stringify(state) !== JSON.stringify(INITIAL_STATE);
}

export default function ProfileNotifications({
  resetSignal,
  onDirtyChange,
}: ProfileNotificationsProps) {
  const [state, setState] = useState<NotificationsState>(INITIAL_STATE);

  useEffect(() => {
    setState(INITIAL_STATE);
  }, [resetSignal]);

  useEffect(() => {
    onDirtyChange(isStateDirty(state));
  }, [state, onDirtyChange]);

  function update<K extends keyof NotificationsState>(key: K, value: NotificationsState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <ProfileSectionCard
      icon="tabler:bell"
      title="Мои уведомления"
      subtitle="Персональные настройки, перекрывают общие"
    >
      <ProfileRow label="Новый лид назначен на меня">
        <div className="flex flex-1 justify-end">
          <Toggle
            checked={state.assignedLead}
            onChange={(checked) => update('assignedLead', checked)}
            aria-label="Новый лид назначен на меня"
          />
        </div>
      </ProfileRow>

      <ProfileRow label="Комментарий к моему лиду">
        <div className="flex flex-1 justify-end">
          <Toggle
            checked={state.commentOnLead}
            onChange={(checked) => update('commentOnLead', checked)}
            aria-label="Комментарий к моему лиду"
          />
        </div>
      </ProfileRow>

      <ProfileRow label="Напоминания">
        <div className="flex flex-1 justify-end">
          <Toggle
            checked={state.reminders}
            onChange={(checked) => update('reminders', checked)}
            aria-label="Напоминания"
          />
        </div>
      </ProfileRow>

      <ProfileRow label="Уведомления в Telegram">
        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="w-[160px]">
            <Input
              placeholder="Telegram Chat ID"
              value={state.telegramChatId}
              disabled={!state.telegramEnabled}
              onChange={(e) => update('telegramChatId', e.target.value)}
            />
          </div>
          <Toggle
            checked={state.telegramEnabled}
            onChange={(checked) => update('telegramEnabled', checked)}
            aria-label="Уведомления в Telegram"
          />
        </div>
      </ProfileRow>
    </ProfileSectionCard>
  );
}
