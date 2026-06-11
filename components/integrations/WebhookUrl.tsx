'use client';

import { Icon } from '@iconify/react';
import { useCallback, useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

const COPY_RESET_MS = 2000;

interface WebhookUrlProps {
  url: string;
}

export default function WebhookUrl({ url }: WebhookUrlProps): ReactNode {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), COPY_RESET_MS);
    } catch (error) {
      console.error('Failed to copy webhook URL:', error);
    }
  }, [url]);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
      <Input
        readOnly
        value={url}
        aria-label="URL вебхука"
        className="
          bg-[var(--color-bg-surface-2)] font-mono text-[13px]
          focus:border-[var(--color-border)] focus:ring-0
        "
      />
      <Button
        type="button"
        variant="secondary"
        size="md"
        icon={copied ? undefined : <Icon icon="lucide:copy" className="h-4 w-4" />}
        className="flex-shrink-0"
        onClick={handleCopy}
      >
        {copied ? 'Скопировано ✓' : 'Скопировать'}
      </Button>
    </div>
  );
}
