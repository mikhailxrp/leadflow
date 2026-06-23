import type { Metadata } from 'next';
import PlatformForgotPasswordForm from '@/components/platform/PlatformForgotPasswordForm';
import Card from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Восстановление пароля платформы',
};

export default function PlatformForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-[400px]">
        <Card padding="none" className="p-8">
          <header className="mb-6">
            <h1 className="mb-1 text-[20px] font-medium text-[var(--color-text-primary)]">
              Восстановление пароля
            </h1>
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              Введите email платформенного администратора
            </p>
          </header>

          <PlatformForgotPasswordForm />
        </Card>
      </div>
    </main>
  );
}
