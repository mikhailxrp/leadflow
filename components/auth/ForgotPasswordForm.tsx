'use client';

import { type FormEvent, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { forgotPasswordSchema } from '@/lib/validations/auth';

export default function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setEmailError(undefined);

    const formData = new FormData(event.currentTarget);
    const parsed = forgotPasswordSchema.safeParse({
      email: String(formData.get('email') ?? ''),
    });

    if (!parsed.success) {
      const emailIssue = parsed.error.issues.find((i) => i.path[0] === 'email');
      if (emailIssue) setEmailError(emailIssue.message);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: parsed.data.email }),
      });

      if (!res.ok) {
        setError('Что-то пошло не так. Попробуйте позже.');
        return;
      }

      setIsSuccess(true);
    } catch {
      setError('Что-то пошло не так. Попробуйте позже.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <p className="text-[14px] text-[var(--color-text-primary)]">
          Если аккаунт с таким email существует, мы отправим ссылку для восстановления пароля.
        </p>
        <p className="text-[12px] text-[var(--color-text-secondary)]">
          Письмо может прийти в течение нескольких минут. Проверьте папку «Спам».
        </p>
        <Link
          href="/login"
          className="text-[12px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          Вернуться к входу
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="text-[12px] text-[#EF4444]" role="alert">
          {error}
        </p>
      )}

      <Input
        label="Email"
        type="email"
        name="email"
        placeholder="you@company.com"
        autoComplete="email"
        required
        error={emailError}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Отправка…' : 'Отправить ссылку'}
      </Button>

      <Link
        href="/login"
        className="text-center text-[12px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        Вернуться к входу
      </Link>
    </form>
  );
}
