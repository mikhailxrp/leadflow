'use client';

import { useRef, useState, type ChangeEvent } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/components/ui/Button';

interface CompanyLogoUploaderProps {
  name: string;
  logoUrl: string | null;
  onLogoChange: (logoUrl: string | null) => void;
}

export default function CompanyLogoUploader({
  name,
  logoUrl,
  onLogoChange,
}: CompanyLogoUploaderProps) {
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

      const response = await fetch('/api/company/logo', {
        method: 'POST',
        body: formData,
      });

      const data: { logoUrl?: string; error?: string } = await response.json();

      if (!response.ok) {
        setError(data.error ?? 'Не удалось загрузить логотип');
        return;
      }

      onLogoChange(data.logoUrl ?? null);
    } catch (err) {
      console.error(err);
      setError('Не удалось загрузить логотип');
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(): Promise<void> {
    setError(null);
    setIsUploading(true);

    try {
      const response = await fetch('/api/company/logo', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete company logo');
      }
      onLogoChange(null);
    } catch (err) {
      console.error(err);
      setError('Не удалось удалить логотип');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={name}
          className="h-20 w-20 shrink-0 rounded-[12px] object-cover"
        />
      ) : (
        <div
          className="
            flex h-20 w-20 shrink-0 items-center justify-center rounded-[12px]
            border-[0.5px] border-[var(--color-border)]
            bg-[var(--color-bg-surface-2)] text-[var(--color-text-tertiary)]
          "
        >
          <Icon icon="tabler:building" className="h-8 w-8" aria-hidden="true" />
        </div>
      )}

      <div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            type="button"
            disabled={isUploading}
            onClick={handleUploadClick}
            icon={<Icon icon="tabler:upload" className="h-4 w-4" />}
          >
            {isUploading ? 'Загрузка…' : logoUrl ? 'Заменить' : 'Загрузить логотип'}
          </Button>
          {logoUrl ? (
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
          <p className="mt-1 text-[11px] text-[#DC2626]" role="alert">
            {error}
          </p>
        ) : (
          <p className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
            JPG, PNG, WEBP до 3MB
          </p>
        )}
      </div>
    </div>
  );
}
