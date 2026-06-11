'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import Input from '@/components/ui/Input';
import ProfileRow from '@/components/profile/ProfileRow';
import ProfileSectionCard from '@/components/profile/ProfileSectionCard';

interface ContactsState {
  email: string;
  phone: string;
  telegram: string;
  max: string;
  other: string;
}

const INITIAL_STATE: ContactsState = {
  email: 'admin@leadflow.ru',
  phone: '+7 (999) 123-45-67',
  telegram: '',
  max: '',
  other: '',
};

function MaxIcon(): ReactNode {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/MAX.svg" alt="" className="h-4 w-4" aria-hidden="true" />
  );
}

interface ContactsSectionProps {
  resetSignal: number;
  onDirtyChange: (dirty: boolean) => void;
}

function isStateDirty(state: ContactsState): boolean {
  return JSON.stringify(state) !== JSON.stringify(INITIAL_STATE);
}

export default function ContactsSection({ resetSignal, onDirtyChange }: ContactsSectionProps) {
  const [state, setState] = useState<ContactsState>(INITIAL_STATE);

  useEffect(() => {
    setState(INITIAL_STATE);
  }, [resetSignal]);

  useEffect(() => {
    onDirtyChange(isStateDirty(state));
  }, [state, onDirtyChange]);

  function update<K extends keyof ContactsState>(key: K, value: ContactsState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <ProfileSectionCard icon="tabler:address-book" title="Контакты">
      <ProfileRow label="Email">
        <div className="flex-1">
          <Input
            type="email"
            value={state.email}
            onChange={(e) => update('email', e.target.value)}
            icon={<Icon icon="tabler:mail" className="h-4 w-4" />}
          />
        </div>
      </ProfileRow>

      <ProfileRow label="Телефон">
        <div className="flex-1">
          <Input
            type="tel"
            value={state.phone}
            onChange={(e) => update('phone', e.target.value)}
            icon={<Icon icon="tabler:phone" className="h-4 w-4" />}
          />
        </div>
      </ProfileRow>

      <div
        className="
          border-y-[0.5px] border-[var(--color-border)]
          bg-[var(--color-bg-surface-2)] px-6 py-1.5
          text-[11px] font-medium tracking-[0.06em]
          text-[var(--color-text-tertiary)]
        "
      >
        МЕССЕНДЖЕРЫ
      </div>

      <ProfileRow label="Telegram">
        <div className="flex-1">
          <Input
            placeholder="@username"
            value={state.telegram}
            onChange={(e) => update('telegram', e.target.value)}
            icon={<Icon icon="simple-icons:telegram" className="h-4 w-4 text-[#3B82F6]" />}
          />
        </div>
      </ProfileRow>

      <ProfileRow label="Max">
        <div className="flex-1">
          <Input
            type="tel"
            placeholder="+7 (999) 000-00-00"
            value={state.max}
            onChange={(e) => update('max', e.target.value)}
            icon={<MaxIcon />}
          />
        </div>
      </ProfileRow>

      <ProfileRow label="Другой">
        <div className="flex-1">
          <Input
            placeholder="Ссылка или контакт"
            value={state.other}
            onChange={(e) => update('other', e.target.value)}
            icon={<Icon icon="tabler:message" className="h-4 w-4" />}
          />
        </div>
      </ProfileRow>
    </ProfileSectionCard>
  );
}
