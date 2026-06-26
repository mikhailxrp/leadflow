import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import LeadComments from '@/components/leads/LeadComments';
import LeadHistory from '@/components/leads/LeadHistory';
import LeadSidebar from '@/components/leads/LeadSidebar';
import TaskBlock from '@/components/tasks/TaskBlock';
import { PageContent } from '@/components/layout/AppLayout';
import { auth } from '@/lib/auth';
import { COMMENT_SELECT, serializeComment } from '@/lib/leads/commentSelect';
import { getLeadVisibility, visibilityWhere } from '@/lib/leads/visibilityFilter';
import { prisma } from '@/lib/prisma';
import type { CompanySession } from '@/types/session';

export const metadata: Metadata = {
  title: 'Лид',
};

interface LeadDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ taskId?: string }>;
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: LeadDetailPageProps) {
  const session = await auth();

  if (!session || session.kind !== 'company') {
    redirect('/login');
  }

  const companySession = session as CompanySession;
  const { id } = await params;
  const { taskId } = await searchParams;
  const { companyId, id: userId, role } = companySession.user;

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { settings: true },
  });

  const leadVisibility = getLeadVisibility(company.settings);
  const visibility = visibilityWhere(role, userId, leadVisibility);

  const andConditions: Prisma.LeadWhereInput[] = [{ id }, { companyId }];
  if (Object.keys(visibility).length > 0) {
    andConditions.push(visibility);
  }

  const lead = await prisma.lead.findFirst({
    where: { AND: andConditions },
    select: { id: true },
  });

  if (!lead) {
    notFound();
  }

  const comments = await prisma.comment.findMany({
    where: {
      leadId: id,
      lead: { companyId },
    },
    select: COMMENT_SELECT,
    orderBy: { createdAt: 'asc' },
  });

  const serializedComments = comments.map(serializeComment);

  return (
    <PageContent>
      <div className="mb-6 rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] px-5 py-8 text-center">
        <p className="text-[14px] text-[var(--color-text-secondary)]">Данные лида появятся в Phase 7</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-6" />

        <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-[440px]">
          <LeadSidebar
            leadId={id}
            hasTakenInWork={false}
            takenAt={null}
            closeType={null}
            assignedTo={null}
          />
          <LeadComments leadId={id} comments={serializedComments} />
          <TaskBlock leadId={id} highlightTaskId={taskId} />
          <LeadHistory />
        </aside>
      </div>
    </PageContent>
  );
}
