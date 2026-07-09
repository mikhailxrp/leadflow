'use client';

import { type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import Input from '@/components/ui/Input';
import ProfileRow from '@/components/profile/ProfileRow';
import ProfileSectionCard from '@/components/profile/ProfileSectionCard';

type ContactField = 'phone' | 'telegram' | 'max' | 'otherContact';

interface ContactsSectionProps {
  email: string;
  phone: string;
  telegram: string;
  max: string;
  otherContact: string;
  onFieldChange: (field: ContactField, value: string) => void;
}

function MaxIcon(): ReactNode {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/MAX.svg" alt="" className="h-4 w-4" aria-hidden="true" />
  );
}

export default function ContactsSection({
  email,
  phone,
  telegram,
  max,
  otherContact,
  onFieldChange,
}: ContactsSectionProps) {
  return (
    <ProfileSectionCard icon="tabler:address-book" title="Контакты">
      <ProfileRow label="Email">
        <div className="flex-1">
          <Input
            type="email"
            value={email}
            disabled
            icon={<Icon icon="tabler:mail" className="h-4 w-4" />}
          />
        </div>
      </ProfileRow>

      <ProfileRow label="Телефон">
        <div className="flex-1">
          <Input
            type="tel"
            value={phone}
            onChange={(e) => onFieldChange('phone', e.target.value)}
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
            value={telegram}
            onChange={(e) => onFieldChange('telegram', e.target.value)}
            icon={<Icon icon="simple-icons:telegram" className="h-4 w-4 text-[#3B82F6]" />}
          />
        </div>
      </ProfileRow>

      <ProfileRow label="Max">
        <div className="flex-1">
          <Input
            type="tel"
            placeholder="+7 (999) 000-00-00"
            value={max}
            onChange={(e) => onFieldChange('max', e.target.value)}
            icon={<MaxIcon />}
          />
        </div>
      </ProfileRow>

      <ProfileRow label="Другой">
        <div className="flex-1">
          <Input
            placeholder="Ссылка или контакт"
            value={otherContact}
            onChange={(e) => onFieldChange('otherContact', e.target.value)}
            icon={<Icon icon="tabler:message" className="h-4 w-4" />}
          />
        </div>
      </ProfileRow>
    </ProfileSectionCard>
  );
}
