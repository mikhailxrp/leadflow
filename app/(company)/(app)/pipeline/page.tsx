import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { PageContent } from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import PipelineBoard from '@/components/pipeline/PipelineBoard';
import NotificationBell from '@/components/notifications/NotificationBell';
import IconButton from '@/components/ui/IconButton';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { toCompanyActor } from '@/lib/auth/requireCompanyAccess';
import { getManagers } from '@/lib/leads/getManagers';
import { getBoardData } from '@/lib/pipeline/boardQuery';
import { prisma } from '@/lib/prisma';
import type { CompanySession } from '@/types/session';

const PIPELINE_SETTINGS_PATH = '/admin/pipeline-settings';

export const metadata: Metadata = {
  title: 'Воронка продаж',
};

function SearchIcon() {
  return (
    <svg
      className="h-5 w-5 text-[var(--color-text-secondary)]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

export default async function PipelinePage() {
  const session = await auth();

  if (!session || session.kind !== 'company') {
    redirect('/login');
  }

  const actor = toCompanyActor(session as CompanySession);
  const { companyId } = actor;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { settings: true },
  });

  if (!company) {
    redirect('/login');
  }

  const showManagerFilter = hasMinRole(actor.role, 'HEAD');
  // /admin/pipeline-settings — только ADMIN (proxy.ts); остальным кнопка не нужна.
  const showPipelineSettingsLink = hasMinRole(actor.role, 'ADMIN');

  const [{ columns }, managers] = await Promise.all([
    getBoardData({
      companyId,
      userId: actor.userId,
      role: actor.role,
      companySettings: company.settings,
      includeClosed: false,
    }),
    showManagerFilter ? getManagers(companyId) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader
        title="Воронка продаж"
        actions={
          <>
            <IconButton aria-label="Поиск" icon={<SearchIcon />} />
            {actor.actor === 'user' && <NotificationBell />}
            {showPipelineSettingsLink && (
              <>
                <span
                  className="mx-1 h-5 w-px bg-[var(--color-border)]"
                  aria-hidden="true"
                />
                <Link
                  href={PIPELINE_SETTINGS_PATH}
                  aria-label="Настроить этапы"
                  title="Настроить этапы"
                  className="
                    inline-flex h-[36px] w-[36px] items-center justify-center gap-2
                    rounded-[6px] border border-[var(--color-border)] border-[0.5px]
                    bg-[var(--color-bg-surface-2)] px-0
                    text-[13px] font-medium text-[var(--color-text-primary)]
                    transition-all duration-150
                    hover:bg-[var(--color-bg-surface)]
                    md:w-auto md:px-[14px]
                  "
                >
                  <span className="h-4 w-4 flex-shrink-0">
                    <SettingsIcon />
                  </span>
                  <span className="hidden md:inline">Настроить этапы</span>
                </Link>
              </>
            )}
          </>
        }
      />

      <PageContent>
        <PipelineBoard
          initialColumns={columns}
          managers={managers}
          showManagerFilter={showManagerFilter}
          readOnly={actor.actor !== 'user'}
        />
      </PageContent>
    </>
  );
}
