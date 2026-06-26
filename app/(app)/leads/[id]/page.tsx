import type { Metadata } from 'next';
import LeadComments from '@/components/leads/LeadComments';
import LeadHistory from '@/components/leads/LeadHistory';
import LeadSidebar from '@/components/leads/LeadSidebar';
import TaskBlock from '@/components/tasks/TaskBlock';
import { PageContent } from '@/components/layout/AppLayout';

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
  const { id } = await params;
  const { taskId } = await searchParams;

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
          <LeadComments />
          <TaskBlock leadId={id} highlightTaskId={taskId} />
          <LeadHistory />
        </aside>
      </div>
    </PageContent>
  );
}
