'use client';

import { useState } from 'react';
import { PageContent } from '@/components/layout/AppLayout';
import LogoutButton from '@/components/layout/LogoutButton';
import NotificationBell from '@/components/notifications/NotificationBell';
import ContactsSection from '@/components/profile/ContactsSection';
import PersonalSection from '@/components/profile/PersonalSection';
import ProfileFooter from '@/components/profile/ProfileFooter';
import ProfileNotifications from '@/components/profile/ProfileNotifications';
import ProfileSidebar from '@/components/profile/ProfileSidebar';
import SecuritySection from '@/components/profile/SecuritySection';
import type { UserProfileDetail } from '@/types/users';

interface ProfileLayoutProps {
  profile: UserProfileDetail;
}

interface ProfileFormState {
  name: string;
  phone: string;
  telegram: string;
  max: string;
  otherContact: string;
}

function toFormState(profile: UserProfileDetail): ProfileFormState {
  return {
    name: profile.name,
    phone: profile.phone ?? '',
    telegram: profile.telegram ?? '',
    max: profile.max ?? '',
    otherContact: profile.otherContact ?? '',
  };
}

export default function ProfileLayout({ profile: initialProfile }: ProfileLayoutProps) {
  const [profile, setProfile] = useState<UserProfileDetail>(initialProfile);
  const [form, setForm] = useState<ProfileFormState>(() => toFormState(initialProfile));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDirty = JSON.stringify(form) !== JSON.stringify(toFormState(profile));

  function handleFieldChange<K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]): void {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCancel(): void {
    setForm(toFormState(profile));
    setError(null);
  }

  async function handleSave(): Promise<void> {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || null,
          telegram: form.telegram.trim() || null,
          max: form.max.trim() || null,
          otherContact: form.otherContact.trim() || null,
        }),
      });

      const data: UserProfileDetail & { error?: string } = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Не удалось сохранить профиль');
        return;
      }

      setProfile(data);
      setForm(toFormState(data));
    } catch (err) {
      console.error(err);
      setError('Не удалось сохранить профиль');
    } finally {
      setIsSaving(false);
    }
  }

  function handleAvatarChange(avatarUrl: string | null): void {
    setProfile((prev) => ({ ...prev, avatarUrl }));
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
          <NotificationBell />
          <LogoutButton />
        </div>
      </header>

      <PageContent>
        <div className="flex flex-row items-start gap-6">
          <ProfileSidebar profile={profile} onAvatarChange={handleAvatarChange} />

          <div className="flex flex-1 flex-col gap-4">
            <PersonalSection
              name={form.name}
              onNameChange={(name) => handleFieldChange('name', name)}
            />
            <ContactsSection
              email={profile.email}
              phone={form.phone}
              telegram={form.telegram}
              max={form.max}
              otherContact={form.otherContact}
              onFieldChange={handleFieldChange}
            />
            <SecuritySection />
            <ProfileNotifications
              initialPreferences={profile.notificationPreferences}
              telegramConnected={profile.telegramConnected}
            />
          </div>
        </div>
      </PageContent>

      <ProfileFooter
        isDirty={isDirty}
        isSaving={isSaving}
        error={error}
        onCancel={handleCancel}
        onSave={handleSave}
      />
    </>
  );
}
