'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Icon } from '@iconify/react';
import Button from '@/components/ui/Button';
import { platformResetPasswordSchema } from '@/lib/validations/platform';

interface PlatformResetPasswordFormProps {
  token: string;
}

type FieldErrors = {
  password?: string;
};

export default function PlatformResetPasswordForm({
  token,
}: PlatformResetPasswordFormProps): ReactNode {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setServerError(null);
    setFieldErrors({});

    const parsed = platformResetPasswordSchema.safeParse({
      token,
      password,
    });

    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'password') {
          nextErrors.password = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/platform/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setServerError(data.error ?? 'Не удалось обновить пароль');
        return;
      }

      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      setServerError('Не удалось обновить пароль');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-[var(--color-text-secondary)]" role="status">
          Пароль обновлён. Теперь вы можете войти в платформу с новым паролем.
        </p>
        <Link href="/platform/login">
          <Button className="w-full">Перейти ко входу</Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {serverError ? (
        <p className="text-[12px] text-[#EF4444]" role="alert">
          {serverError}
        </p>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="platform-reset-password"
          className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]"
        >
          Новый пароль
        </label>
        <div className="relative">
          <input
            id="platform-reset-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Минимум 8 символов"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={`
              h-[36px] w-full rounded-[6px]
              border border-[var(--color-border)] border-[0.5px]
              bg-[var(--color-bg-surface)]
              px-3 pr-9 text-[14px] text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-tertiary)]
              transition-all duration-150 outline-none
              focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
              ${fieldErrors.password ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#EF4444]' : ''}
            `}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] transition-colors duration-150 hover:text-[var(--color-text-secondary)]"
            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
          >
            <Icon icon="tabler:eye" className="h-4 w-4" />
          </button>
        </div>
        {fieldErrors.password ? (
          <span className="text-[12px] text-[#EF4444]">{fieldErrors.password}</span>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Сохранение…' : 'Сохранить пароль'}
      </Button>

      <Link
        href="/platform/login"
        className="text-center text-[12px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        Вернуться ко входу
      </Link>
    </form>
  );
}
