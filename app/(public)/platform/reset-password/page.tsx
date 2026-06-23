import type { Metadata } from 'next';
import Link from 'next/link';
import PlatformResetPasswordForm from '@/components/platform/PlatformResetPasswordForm';
import Card from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Новый пароль платформы',
};

interface PlatformResetPasswordPageProps {
  searchParams: Promise<{
    token?: string;
  }>;
}

export default async function PlatformResetPasswordPage({
  searchParams,
}: PlatformResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-[400px]">
        <Card padding="none" className="p-8">
          <header className="mb-6">
            <h1 className="mb-1 text-[20px] font-medium text-[var(--color-text-primary)]">
              Новый пароль
            </h1>
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              Задайте новый пароль для платформенного администратора
            </p>
          </header>

          {token ? (
            <PlatformResetPasswordForm token={token} />
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-[13px] text-[#EF4444]">
                Недействительная ссылка восстановления.
              </p>
              <Link
                href="/platform/forgot-password"
                className="text-[12px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
              >
                Запросить новую ссылку
              </Link>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
