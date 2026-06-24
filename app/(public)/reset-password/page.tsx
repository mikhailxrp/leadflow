import type { Metadata } from 'next';
import Link from 'next/link';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Новый пароль',
};

interface ResetPasswordPageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="w-full max-w-[360px]">
          <p className="mb-4 text-[14px] text-[#EF4444]">
            Ссылка недействительна или устарела.
          </p>
          <Link
            href="/forgot-password"
            className="text-[14px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            Запросить новую ссылку
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-[360px]">
        <h1 className="mb-2 text-[28px] font-medium tracking-[-0.01em] text-[var(--color-text-primary)]">
          Новый пароль
        </h1>
        <p className="mb-6 text-[14px] text-[var(--color-text-secondary)]">
          Придумайте пароль не менее 8 символов.
        </p>
        <ResetPasswordForm token={token} />
        <p className="mt-4 text-[12px] text-[var(--color-text-secondary)]">
          Не та ссылка?{' '}
          <Link
            href="/forgot-password"
            className="transition-colors hover:text-[var(--color-text-primary)]"
          >
            Запросить новую
          </Link>
        </p>
      </div>
    </main>
  );
}
