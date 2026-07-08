import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';
import Card from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Вход',
};

interface LoginPageProps {
  searchParams: Promise<{ registered?: string; reset?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { registered, reset } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-[400px]">
        <Card padding="none" className="p-8">
          <div className="mb-8 flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]"
              aria-hidden="true"
            />
            <span className="text-[14px] font-medium text-[var(--color-text-primary)]">
              Лид-Канал
            </span>
          </div>

          {registered === '1' && (
            <p
              className="mb-6 rounded-[6px] border border-[0.5px] border-[#10B981] bg-[rgba(16,185,129,0.08)] px-3 py-2 text-[13px] text-[var(--color-text-primary)]"
              role="status"
            >
              Регистрация завершена, войдите
            </p>
          )}

          {reset === '1' && (
            <p
              className="mb-6 rounded-[6px] border border-[0.5px] border-[#22C55E] bg-[rgba(34,197,94,0.08)] px-3 py-2 text-[13px] text-[var(--color-text-primary)]"
              role="status"
            >
              Пароль успешно изменён, войдите
            </p>
          )}

          <header className="mb-6">
            <h1 className="mb-1 text-[20px] font-medium text-[var(--color-text-primary)]">
              Вход в систему
            </h1>
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              Введите данные для входа
            </p>
          </header>

          <LoginForm />
        </Card>
      </div>
    </main>
  );
}
