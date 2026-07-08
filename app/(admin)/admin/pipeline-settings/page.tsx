import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PageContent } from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import PipelineSettings from '@/components/pipeline/PipelineSettings';
import { type StageData } from '@/components/pipeline/StageRow';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Настройки воронки',
};

export default async function AdminPipelinePage() {
  const session = await auth();
  if (!session || session.kind !== 'company' || !session.user) {
    redirect('/login');
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    redirect('/today');
  }

  const { companyId } = session.user;

  const stagesRaw = await prisma.pipelineStage.findMany({
    where: { companyId },
    orderBy: { order: 'asc' },
    select: {
      id: true,
      name: true,
      color: true,
      order: true,
      stageTimeLimitDays: true,
      _count: { select: { leads: true } },
    },
  });

  const initialStages: StageData[] = stagesRaw.map(({ _count, ...rest }) => ({
    ...rest,
    leadsCount: _count.leads,
  }));

  return (
    <>
      <PageHeader title="Настройки воронки" />

      <PageContent>
        <p className="mb-6 text-[13px] text-[var(--color-text-secondary)]">
          Перетащите этапы чтобы изменить порядок. Изменения сохраняются автоматически.
        </p>

        <PipelineSettings initialStages={initialStages} />
      </PageContent>
    </>
  );
}
