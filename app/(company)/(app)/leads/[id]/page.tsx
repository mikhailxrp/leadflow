import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { hasMinRole } from '@/constants/roles';
import { toCompanyActor } from '@/lib/auth/requireCompanyAccess';
import { getLeadById } from '@/lib/leads/getLeadById';
import { prisma } from '@/lib/prisma';
import type { CompanySession } from '@/types/session';
import { PageContent } from '@/components/layout/AppLayout';
import LeadHeader from '@/components/leads/LeadHeader';
import LeadContacts from '@/components/leads/LeadContacts';
import LeadCustomFields from '@/components/leads/LeadCustomFields';
import LeadMarketing from '@/components/leads/LeadMarketing';
import LeadEditForm from '@/components/leads/LeadEditForm';
import DeleteLeadModal from '@/components/leads/DeleteLeadModal';
import DuplicateBlock from '@/components/leads/DuplicateBlock';
import RiskBadge from '@/components/leads/RiskBadge';
import LeadSidebar from '@/components/leads/LeadSidebar';
import LeadComments from '@/components/leads/LeadComments';
import LeadHistory from '@/components/leads/LeadHistory';
import TaskBlock from '@/components/tasks/TaskBlock';
import ReminderBlock from '@/components/reminders/ReminderBlock';
import type { HistoryEventItem } from '@/constants/eventLabels';

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

  const actor = toCompanyActor(session as CompanySession);

  const { id } = await params;
  const { taskId } = await searchParams;

  const lead = await getLeadById(id, actor);

  if (!lead) {
    notFound();
  }

  // Serialize dates for client components
  const serializedComments = lead.comments.map((c) => ({
    id: c.id,
    text: c.text,
    createdAt: c.createdAt.toISOString(),
    user: c.user,
  }));

  const serializedEvents: HistoryEventItem[] = lead.events.map((e) => ({
    id: e.id,
    type: e.type,
    createdAt: e.createdAt.toISOString(),
    userName: e.userName,
    lossReasonLabel: e.lossReasonLabel,
  }));

  const takenAtStr = lead.takenAt ? lead.takenAt.toISOString() : null;

  const telegramConnected =
    actor.actor === 'user'
      ? (
          await prisma.user.findUnique({
            where: { id: actor.userId },
            select: { telegramChatId: true },
          })
        )?.telegramChatId != null
      : false;

  return (
    <PageContent>
      <LeadHeader
        name={lead.name}
        stage={lead.stage}
        closeType={lead.closeType}
      />

      <div className="flex flex-col gap-6 xl:flex-row">
        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex items-center gap-3">
            <RiskBadge level={lead.risk.level} reason={lead.risk.reason} />
            {lead.risk.reason && (
              <span className="text-[13px] text-[var(--color-text-secondary)]">
                {lead.risk.reason}
              </span>
            )}
          </div>

          <LeadContacts
            name={lead.name}
            phone={lead.phone}
            email={lead.email}
            createdAt={lead.createdAt.toISOString()}
          />

          <DuplicateBlock duplicates={lead.duplicates} />

          <LeadMarketing
            source={lead.source}
            marketing={lead.marketing}
            utm={lead.utm}
          />

          <LeadCustomFields fields={lead.customFields} />

          {actor.actor === 'user' && (
            <LeadEditForm
              leadId={lead.id}
              initialName={lead.name}
              initialPhone={lead.phone}
              initialEmail={lead.email}
              initialComment={lead.comment}
            />
          )}

          {actor.actor === 'user' && (
            <DeleteLeadModal
              leadId={lead.id}
              leadName={lead.name}
              role={actor.role}
            />
          )}
        </div>

        {/* Right column */}
        <aside className="flex w-full shrink-0 flex-col gap-6 xl:w-[360px] 2xl:w-[440px]">
          <LeadSidebar
            leadId={lead.id}
            hasTakenInWork={lead.hasTakenInWork}
            takenAt={takenAtStr}
            closeType={lead.closeType}
            assignedTo={lead.assignedTo}
            canAssign={actor.actor === 'user' && hasMinRole(actor.role, 'HEAD')}
            canManage={actor.actor === 'user'}
            qualification={lead.qualification}
            canQualify={actor.actor === 'marketer' || actor.actor === 'user'}
          />
          <LeadComments
            leadId={lead.id}
            comments={serializedComments}
            canComment={actor.actor === 'user'}
          />
          {actor.actor === 'user' && (
            <TaskBlock
              leadId={lead.id}
              currentUserId={actor.userId}
              canDelete={hasMinRole(actor.role, 'ADMIN')}
              highlightTaskId={taskId}
            />
          )}
          {actor.actor === 'user' && (
            <ReminderBlock
              leadId={lead.id}
              currentUserId={actor.userId}
              isAdmin={hasMinRole(actor.role, 'ADMIN')}
              telegramConnected={telegramConnected}
            />
          )}
          <LeadHistory events={serializedEvents} />
        </aside>
      </div>
    </PageContent>
  );
}
