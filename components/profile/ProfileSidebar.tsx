'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { Icon } from '@iconify/react';
import type { UserRole } from '@prisma/client';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import type { UserProfileDetail } from '@/types/users';

interface ProfileSidebarProps {
  profile: UserProfileDetail;
  onAvatarChange: (avatarUrl: string | null) => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Администратор',
  HEAD: 'Руководитель',
  MANAGER: 'Менеджер',
};

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  ADMIN: 'bg-[#D1FAE5] text-[#065F46]',
  HEAD: 'bg-[#DBEAFE] text-[#1E40AF]',
  MANAGER: 'bg-[var(--color-bg-surface-2)] text-[var(--color-text-secondary)]',
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatLastLogin(value: string | null): string {
  if (!value) {
    return 'Никогда';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function ProfileSidebar({ profile, onAvatarChange }: ProfileSidebarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleUploadClick(): void {
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/users/me/avatar', {
        method: 'POST',
        body: formData,
      });

      const data: { avatarUrl?: string; error?: string } = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Не удалось загрузить аватар');
        return;
      }

      onAvatarChange(data.avatarUrl ?? null);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить аватар');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(): Promise<void> {
    setError(null);
    setIsUploading(true);

    try {
      const response = await fetch('/api/users/me/avatar', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete avatar');
      }
      onAvatarChange(null);
    } catch (err) {
      console.error(err);
      setError('Не удалось удалить аватар');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <aside className="w-full rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] p-6 lg:w-[280px] lg:shrink-0">
      <div className="flex justify-center">
        <Avatar
          initials={getInitials(profile.name)}
          src={profile.avatarUrl ?? undefined}
          size="lg"
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="mt-4 flex justify-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          type="button"
          disabled={isUploading}
          onClick={handleUploadClick}
          icon={<Icon icon="tabler:upload" className="h-4 w-4" />}
        >
          {isUploading ? 'Загрузка…' : profile.avatarUrl ? 'Заменить' : 'Загрузить фото'}
        </Button>
        {profile.avatarUrl ? (
          <Button
            variant="ghost"
            size="sm"
            type="button"
            disabled={isUploading}
            onClick={handleDelete}
          >
            Удалить
          </Button>
        ) : null}
      </div>

      {error ? (
        <p className="mt-1 text-center text-[11px] text-[#DC2626]" role="alert">
          {error}
        </p>
      ) : (
        <p className="mt-1 text-center text-[11px] text-[var(--color-text-tertiary)]">
          JPG, PNG, WEBP до 3MB
        </p>
      )}

      <p className="mt-4 text-center text-[15px] font-medium text-[var(--color-text-primary)]">
        {profile.name}
      </p>

      <div className="mt-1 flex justify-center">
        <span
          className={`rounded-[20px] px-3 py-1 text-[12px] font-medium ${ROLE_BADGE_CLASS[profile.role]}`}
        >
          {ROLE_LABELS[profile.role]}
        </span>
      </div>

      <div className="mt-4 border-t-[0.5px] border-[var(--color-border)]" />

      <div className="mt-4 flex flex-col gap-2 text-[12px] text-[var(--color-text-secondary)]">
        <div className="flex items-center gap-2">
          <Icon icon="tabler:calendar" className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>В системе с {formatDate(profile.createdAt)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Icon icon="tabler:clock" className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Последний вход: {formatLastLogin(profile.lastLoginAt)}</span>
        </div>
      </div>
    </aside>
  );
}
