import type { Metadata } from 'next';
import AcceptInviteForm from '@/components/auth/AcceptInviteForm';
import Card from '@/components/ui/Card';
import { findValidInviteByToken } from '@/lib/auth/acceptInvite';

export const metadata: Metadata = {
  title: 'Приглашение',
};

interface AcceptInvitePageProps {
  searchParams: Promise<{ token?: string }>;
}

export default async function AcceptInvitePage({
  searchParams,
}: AcceptInvitePageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <Card padding="none" className="w-full max-w-[400px] p-8">
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            Ссылка недействительна. Запросите новую у платформенного
            администратора.
          </p>
        </Card>
      </main>
    );
  }

  const invite = await findValidInviteByToken(token);

  if (!invite) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <Card padding="none" className="w-full max-w-[400px] p-8">
          <p className="text-[14px] text-[var(--color-text-secondary)]">
            Ссылка недействительна или просрочена. Запросите новую у
            платформенного администратора.
          </p>
        </Card>
      </main>
    );
  }

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
              LeadFlow
            </span>
          </div>

          <header className="mb-6">
            <h1 className="mb-1 text-[20px] font-medium text-[var(--color-text-primary)]">
              Приглашение в LeadFlow
            </h1>
            <p className="text-[14px] text-[var(--color-text-secondary)]">
              Задайте имя и пароль для первого администратора компании
            </p>
          </header>

          <AcceptInviteForm token={token} email={invite.email} />
        </Card>
      </div>
    </main>
  );
}
