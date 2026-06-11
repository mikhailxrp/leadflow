'use client';

import { useEffect, useState } from 'react';
import Input from '@/components/ui/Input';
import SettingsCard from '@/components/settings/SettingsCard';
import SettingsRow from '@/components/settings/SettingsRow';
import Toggle from '@/components/settings/Toggle';

interface NotificationsState {
  newLead: boolean;
  assignedToMe: boolean;
  commentOnMyLead: boolean;
  reminder: boolean;
  telegramEnabled: boolean;
  telegramChatId: string;
}

const INITIAL_STATE: NotificationsState = {
  newLead: true,
  assignedToMe: true,
  commentOnMyLead: true,
  reminder: true,
  telegramEnabled: false,
  telegramChatId: '',
};

interface NotificationsSectionProps {
  onDirtyChange: (dirty: boolean) => void;
}

function isStateDirty(state: NotificationsState): boolean {
  return JSON.stringify(state) !== JSON.stringify(INITIAL_STATE);
}

export default function NotificationsSection({ onDirtyChange }: NotificationsSectionProps) {
  const [state, setState] = useState<NotificationsState>(INITIAL_STATE);

  useEffect(() => {
    onDirtyChange(isStateDirty(state));
  }, [state, onDirtyChange]);

  function update<K extends keyof NotificationsState>(key: K, value: NotificationsState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <SettingsCard icon="tabler:bell" title="Уведомления">
      <SettingsRow label="Новый лид поступил">
        <Toggle
          checked={state.newLead}
          onChange={(checked) => update('newLead', checked)}
          aria-label="Новый лид поступил"
        />
      </SettingsRow>

      <SettingsRow label="Лид назначен на меня">
        <Toggle
          checked={state.assignedToMe}
          onChange={(checked) => update('assignedToMe', checked)}
          aria-label="Лид назначен на меня"
        />
      </SettingsRow>

      <SettingsRow label="Комментарий к моему лиду">
        <Toggle
          checked={state.commentOnMyLead}
          onChange={(checked) => update('commentOnMyLead', checked)}
          aria-label="Комментарий к моему лиду"
        />
      </SettingsRow>

      <SettingsRow label="Напоминание по лиду">
        <Toggle
          checked={state.reminder}
          onChange={(checked) => update('reminder', checked)}
          aria-label="Напоминание по лиду"
        />
      </SettingsRow>

      <SettingsRow label="Уведомления в Telegram">
        <div className="w-[160px]">
          <Input
            placeholder="Telegram Chat ID"
            value={state.telegramChatId}
            disabled={!state.telegramEnabled}
            onChange={(e) => update('telegramChatId', e.target.value)}
            className="h-[36px]"
          />
        </div>
        <Toggle
          checked={state.telegramEnabled}
          onChange={(checked) => update('telegramEnabled', checked)}
          aria-label="Уведомления в Telegram"
        />
      </SettingsRow>
    </SettingsCard>
  );
}
