'use client';

import { type FormEvent, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { loginSchema } from '@/lib/validations/platform';

const GENERIC_LOGIN_ERROR = 'Неверный email или пароль';
const PLATFORM_LOGIN_REDIRECT = '/platform/companies';

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function PlatformLoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: String(formData.get('email') ?? ''),
      password: String(formData.get('password') ?? ''),
    });

    if (!parsed.success) {
      const nextFieldErrors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === 'email' || field === 'password') {
          nextFieldErrors[field] = issue.message;
        }
      }
      setFieldErrors(nextFieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signIn('platform-credentials', {
        email: parsed.data.email,
        password: parsed.data.password,
        redirect: false,
        redirectTo: PLATFORM_LOGIN_REDIRECT,
      });

      if (result?.error) {
        setError(GENERIC_LOGIN_ERROR);
        return;
      }

      router.push(PLATFORM_LOGIN_REDIRECT);
    } catch (submitError: unknown) {
      console.error(submitError);
      setError(GENERIC_LOGIN_ERROR);
    } finally {
      setIsSubmitting(false);
    }
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
        placeholder="admin@leadflow.ru"
        autoComplete="email"
        required
        error={fieldErrors.email}
      />

      <Input
        label="Пароль"
        type="password"
        name="password"
        placeholder="••••••••"
        autoComplete="current-password"
        required
        error={fieldErrors.password}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Вход…' : 'Войти'}
      </Button>
    </form>
  );
}
