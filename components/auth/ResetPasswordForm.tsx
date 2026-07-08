'use client';

import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import Button from '@/components/ui/Button';

interface ResetPasswordFormProps {
  token: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  TOKEN_INVALID: 'Ссылка недействительна. Запросите новую в форме восстановления пароля.',
  TOKEN_EXPIRED: 'Ссылка устарела. Запросите новую в форме восстановления пароля.',
  TOKEN_USED: 'Ссылка уже была использована. Войдите или запросите новую.',
  TOO_MANY_REQUESTS: 'Слишком много попыток. Повторите через час.',
  SERVER_ERROR: 'Не удалось сохранить пароль. Попробуйте позже.',
};

export default function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Пароль должен содержать не менее 8 символов.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = (await res.json()) as { success?: boolean; error?: string };

      if (!res.ok || !data.success) {
        const code = data.error ?? 'SERVER_ERROR';
        setError(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.SERVER_ERROR);
        return;
      }

      router.push('/login?reset=1');
    } catch {
      setError(ERROR_MESSAGES.SERVER_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="text-[13px] text-[#EF4444]" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="new-password"
          className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]"
        >
          Новый пароль
        </label>
        <div className="relative">
          <input
            id="new-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
            className="h-[36px] w-full rounded-[6px] border border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] px-3 pr-9 text-[14px] text-[var(--color-text-primary)] outline-none transition-all duration-150 placeholder:text-[var(--color-text-tertiary)] focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] transition-colors duration-150 hover:text-[var(--color-text-secondary)]"
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          >
            <Icon
              icon={showPassword ? 'tabler:eye-off' : 'tabler:eye'}
              className="h-4 w-4"
            />
          </button>
        </div>
        <p className="text-[12px] text-[var(--color-text-secondary)]">
          Не менее 8 символов
        </p>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Сохранение…' : 'Сохранить пароль'}
      </Button>
    </form>
  );
}
