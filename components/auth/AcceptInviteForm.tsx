'use client';

import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface AcceptInviteFormProps {
  token: string;
  email: string;
}

const ERROR_MESSAGES: Record<string, string> = {
  INVITE_INVALID:
    'Ссылка недействительна или просрочена. Запросите новую у платформенного администратора.',
  EMAIL_EXISTS: 'Этот email уже зарегистрирован. Войдите через форму входа.',
  VALIDATION_ERROR: 'Проверьте корректность заполнения полей.',
  SERVER_ERROR: 'Не удалось завершить регистрацию. Попробуйте позже.',
};

export default function AcceptInviteForm({
  token,
  email,
}: AcceptInviteFormProps): ReactNode {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password }),
      });

      const data = (await response.json()) as {
        success: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        setError(ERROR_MESSAGES[data.error ?? 'SERVER_ERROR'] ?? ERROR_MESSAGES.SERVER_ERROR);
        return;
      }

      // Аккаунт создан. Автовход тем же паролем. Email — из приглашения
      // (поле в форме disabled), совпадает с записью созданного пользователя.
      // Если автовход не удался — аккаунт уже существует, поэтому показывать
      // ошибку и предлагать повторный сабмит нельзя (упрётся в EMAIL_EXISTS):
      // graceful fallback на форму входа с баннером об успешной регистрации.
      try {
        const signInResult = await signIn('company-credentials', {
          email,
          password,
          redirect: false,
          redirectTo: '/today',
        });

        if (signInResult?.error) {
          router.push('/login?registered=1');
          return;
        }

        router.push('/today');
      } catch (signInError) {
        console.error('Auto sign-in after invite failed:', signInError);
        router.push('/login?registered=1');
      }
    } catch (submitError) {
      console.error('Accept invite failed:', submitError);
      setError(ERROR_MESSAGES.SERVER_ERROR);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <Input
        label="Email"
        type="email"
        value={email}
        disabled
        readOnly
      />

      <Input
        label="Имя"
        type="text"
        value={name}
        onChange={(event) => setName(event.target.value)}
        required
        autoComplete="name"
      />

      <Input
        label="Пароль"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
        minLength={8}
        autoComplete="new-password"
      />
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
