'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';

interface TelegramBindButtonProps {
  connected: boolean;
}

export default function TelegramBindButton({ connected }: TelegramBindButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleConnect(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/telegram/bind', { method: 'POST' });
      const data: { deepLink?: string; error?: string } = await response.json();

      if (!response.ok || !data.deepLink) {
        setError(data.error ?? 'Не удалось получить ссылку на бота');
        return;
      }

      setDeepLink(data.deepLink);
      window.open(data.deepLink, '_blank', 'noopener,noreferrer');
    } catch (err) {
      console.error(err);
      setError('Не удалось получить ссылку на бота');
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect(): Promise<void> {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/telegram/bind', { method: 'DELETE' });

      if (!response.ok) {
        setError('Не удалось отключить Telegram');
        return;
      }

      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Не удалось отключить Telegram');
    } finally {
      setLoading(false);
    }
  }

  if (connected) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-[var(--color-text-secondary)]">Подключено</span>
          <Button variant="secondary" size="sm" disabled={loading} onClick={handleDisconnect}>
            Отключить
          </Button>
        </div>
        {error && (
          <p className="text-[11px] text-[#DC2626]" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-3">
        {deepLink && (
          <a
            href={deepLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-[#10B981] hover:underline"
          >
            Открыть бота
          </a>
        )}
        <Button size="sm" disabled={loading} onClick={handleConnect}>
          Подключить
        </Button>
      </div>
      {error && (
        <p className="text-[11px] text-[#DC2626]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
