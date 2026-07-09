import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import CreateLeadForm from '@/components/leads/CreateLeadForm';
import NotificationBell from '@/components/notifications/NotificationBell';
import { auth } from '@/lib/auth';
import { toCompanyActor } from '@/lib/auth/requireCompanyAccess';
import type { CompanySession } from '@/types/session';

export const metadata: Metadata = {
  title: 'Новый лид',
};

export default async function CreateLeadPage() {
  const session = await auth();
  if (!session || session.kind !== 'company') {
    redirect('/login');
  }

  const actor = toCompanyActor(session as CompanySession);

  return (
    <>
      <header
        className="
          sticky top-0 z-30 flex h-[56px] shrink-0 items-center justify-between
          border-b-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] px-6
        "
      >
        <nav aria-label="Хлебные крошки" className="flex items-center gap-2 text-[20px]">
          <Link
            href="/leads"
            className="font-medium text-[var(--color-text-secondary)] transition-colors duration-150 hover:text-[var(--color-text-primary)]"
          >
            Лиды
          </Link>
          <span className="text-[var(--color-text-tertiary)]" aria-hidden="true">
            /
          </span>
          <span className="font-medium text-[var(--color-text-primary)]">Новый лид</span>
        </nav>

        <div className="flex items-center gap-3">
          {actor.actor === 'user' && <NotificationBell />}
        </div>
      </header>

      <CreateLeadForm />
    </>
  );
}
