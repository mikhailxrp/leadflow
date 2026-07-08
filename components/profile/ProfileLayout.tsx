'use client';

import { useCallback, useState } from 'react';
import { PageContent } from '@/components/layout/AppLayout';
import LogoutButton from '@/components/layout/LogoutButton';
import IconButton from '@/components/ui/IconButton';
import ContactsSection from '@/components/profile/ContactsSection';
import PersonalSection from '@/components/profile/PersonalSection';
import ProfileFooter from '@/components/profile/ProfileFooter';
import ProfileNotifications from '@/components/profile/ProfileNotifications';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import SecuritySection from '@/components/profile/SecuritySection';

type DirtyKey = 'personal' | 'contacts' | 'security' | 'notifications';

function BellIcon() {
  return (
    <svg
      className="h-5 w-5 text-[var(--color-text-secondary)]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

export default function ProfileLayout() {
  const [dirtyFlags, setDirtyFlags] = useState<Record<DirtyKey, boolean>>({
    personal: false,
    contacts: false,
    security: false,
    notifications: false,
  });
  const [resetSignal, setResetSignal] = useState(0);

  const handleDirtyChange = useCallback((key: DirtyKey, dirty: boolean) => {
    setDirtyFlags((prev) => (prev[key] === dirty ? prev : { ...prev, [key]: dirty }));
  }, []);

  const isDirty = Object.values(dirtyFlags).some(Boolean);

  function handleCancel() {
    setResetSignal((prev) => prev + 1);
    setDirtyFlags({
      personal: false,
      contacts: false,
      security: false,
      notifications: false,
    });
  }

  function handleSave() {
    setResetSignal((prev) => prev + 1);
    setDirtyFlags({
      personal: false,
      contacts: false,
      security: false,
      notifications: false,
    });
  }

  return (
    <>
      <header
        className="
          sticky top-0 z-30 flex h-[56px] flex-shrink-0 items-center justify-between
          border-b-[0.5px] border-[var(--color-border)]
          bg-[var(--color-bg-surface)] px-6
        "
      >
        <nav
          className="text-[13px] text-[var(--color-text-secondary)]"
          aria-label="Хлебные крошки"
        >
          Настройки › Профиль пользователя
        </nav>

        <div className="flex items-center gap-3">
          <IconButton
            aria-label="Уведомления"
            icon={<BellIcon />}
          />
          <LogoutButton />
        </div>
      </header>

      <PageContent>
        <div className="flex flex-row items-start gap-6">
          <ProfileSidebar />

          <div className="flex flex-1 flex-col gap-4">
            <PersonalSection
              key={`personal-${resetSignal}`}
              onDirtyChange={(dirty) => handleDirtyChange('personal', dirty)}
            />
            <ContactsSection
              key={`contacts-${resetSignal}`}
              onDirtyChange={(dirty) => handleDirtyChange('contacts', dirty)}
            />
            <SecuritySection
              key={`security-${resetSignal}`}
              onDirtyChange={(dirty) => handleDirtyChange('security', dirty)}
            />
            <ProfileNotifications
              key={`notifications-${resetSignal}`}
              onDirtyChange={(dirty) => handleDirtyChange('notifications', dirty)}
            />
          </div>
        </div>

        <ProfileFooter isDirty={isDirty} onCancel={handleCancel} onSave={handleSave} />
      </PageContent>
    </>
  );
}
