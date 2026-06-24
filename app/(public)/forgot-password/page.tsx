import type { Metadata } from 'next';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Восстановление пароля',
};

export default function ForgotPasswordPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-8">
      <div className="w-full max-w-[360px]">
        <h1 className="mb-2 text-[28px] font-medium tracking-[-0.01em] text-[var(--color-text-primary)]">
          Восстановление пароля
        </h1>
        <p className="mb-6 text-[14px] text-[var(--color-text-secondary)]">
          Введите email — мы отправим ссылку для сброса пароля.
        </p>
        <ForgotPasswordForm />
      </div>
    </main>
  );
}
