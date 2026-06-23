import type { Metadata } from 'next';
import PlatformLoginForm from '@/components/platform/PlatformLoginForm';
import Card from '@/components/ui/Card';

export const metadata: Metadata = {
  title: 'Вход платформы',
};

export default function PlatformLoginPage() {
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
              LeadFlow Platform
            </span>
          </div>

          <header className="mb-6">
            <h1 className="mb-1 text-[20px] font-medium text-[var(--color-text-primary)]">
              Вход платформы
            </h1>
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              Доступ для платформенных администраторов
            </p>
          </header>

          <PlatformLoginForm />
        </Card>
      </div>
    </main>
  );
}
