'use client';

import { type FormEvent, useState } from 'react';
import { Icon } from '@iconify/react';
import Link from 'next/link';
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
  const [showPassword, setShowPassword] = useState(false);

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

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="platform-login-password"
          className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]"
        >
          Пароль
        </label>
        <div className="relative">
          <input
            id="platform-login-password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="••••••••"
            autoComplete="current-password"
            required
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
        {fieldErrors.password && (
          <span className="text-[12px] text-[#EF4444]">{fieldErrors.password}</span>
        )}
      </div>

      <Button
        type="submit"
        variant="primary"
        size="lg"
        className="w-full"
        disabled={isSubmitting}
      >
        {isSubmitting ? 'Вход…' : 'Войти'}
      </Button>

      <Link
        href="/platform/forgot-password"
        className="text-center text-[12px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
      >
        Забыли пароль?
      </Link>
    </form>
  );
}
