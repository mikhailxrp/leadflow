'use client';

import { useEffect } from 'react';
import Button from '@/components/ui/Button';

interface PlatformErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function PlatformError({ error, reset }: PlatformErrorProps) {
  useEffect(() => {
    console.error('Platform section error:', error);
  }, [error]);

  return (
    <div className="flex h-full min-h-[400px] items-center justify-center px-6 py-8">
      <div className="flex max-w-[420px] flex-col items-center gap-3 text-center">
        <p className="text-[15px] font-medium text-[var(--color-text-primary)]">
          Что-то пошло не так
        </p>
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          Не удалось загрузить страницу. Попробуйте ещё раз.
        </p>
        <Button type="button" variant="secondary" onClick={reset}>
          Повторить
        </Button>
      </div>
    </div>
  );
}
