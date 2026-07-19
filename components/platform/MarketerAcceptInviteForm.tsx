'use client';

import { Icon } from '@iconify/react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface MarketerAcceptInviteFormProps {
  token: string;
  email: string;
  initialName: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  INVITE_INVALID:
    'Ссылка недействительна или просрочена. Запросите новую у платформенного администратора.',
  VALIDATION_ERROR: 'Проверьте корректность заполнения полей.',
  TOO_MANY_REQUESTS: 'Слишком много попыток. Попробуйте позже.',
  SERVER_ERROR: 'Не удалось завершить регистрацию. Попробуйте позже.',
};

export default function MarketerAcceptInviteForm({
  token,
  email,
  initialName,
}: MarketerAcceptInviteFormProps): ReactNode {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/platform/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(
          ERROR_MESSAGES[data.error ?? 'SERVER_ERROR'] ??
            ERROR_MESSAGES.SERVER_ERROR,
        );
        return;
      }

      // Пароль задан. Автовход тем же паролем через платформенный провайдер.
      // Email — из приглашения (поле disabled), совпадает с записью маркетолога.
      try {
        const signInResult = await signIn('platform-credentials', {
          email,
          password,
          redirect: false,
        });

        if (signInResult?.error) {
          router.push('/platform/login');
          return;
        }

        router.push('/platform/companies');
      } catch (signInError) {
        console.error('Auto sign-in after marketer invite failed:', signInError);
        router.push('/platform/login');
      }
    } catch (submitError) {
      console.error('Accept marketer invite failed:', submitError);
      setError(ERROR_MESSAGES.SERVER_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <Input label="Email" type="email" value={email} disabled readOnly />

      <Input
        label="Имя"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
        autoComplete="name"
      />

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="marketer-invite-password"
          className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]"
        >
          Пароль
        </label>
        <div className="relative">
          <input
            id="marketer-invite-password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
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
      </div>
      <p className="-mt-2 text-[12px] text-[var(--color-text-secondary)]">
        Не менее 8 символов
      </p>

      {error ? (
        <p className="text-[13px] text-[#DC2626]" role="alert">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Создание аккаунта…' : 'Создать аккаунт'}
      </Button>
    </form>
  );
}
