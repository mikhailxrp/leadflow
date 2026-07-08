'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { platformForgotPasswordSchema } from '@/lib/validations/platform';

type FieldErrors = {
  email?: string;
};

export default function PlatformForgotPasswordForm(): ReactNode {
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setServerError(null);
    setFieldErrors({});
    setIsSuccess(false);

    const parsed = platformForgotPasswordSchema.safeParse({
      email: email.trim(),
    });

    if (!parsed.success) {
      const nextErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === 'email') {
          nextErrors.email = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/platform/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        setServerError(data.error ?? 'Не удалось отправить ссылку');
        return;
      }

      setIsSuccess(true);
    } catch (error) {
      console.error(error);
      setServerError('Не удалось отправить ссылку');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {isSuccess ? (
        <p className="text-[13px] text-[var(--color-text-secondary)]" role="status">
          Если администратор с таким email существует, мы отправили ссылку для
          восстановления.
        </p>
      ) : null}

      {serverError ? (
        <p className="text-[12px] text-[#EF4444]" role="alert">
          {serverError}
        </p>
      ) : null}

      <Input
        label="Email"
        type="email"
        placeholder="admin@lidkanal.ru"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={fieldErrors.email}
        autoComplete="email"
        autoFocus
      />

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Отправка…' : 'Отправить ссылку'}
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
