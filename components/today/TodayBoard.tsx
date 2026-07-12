import { type ReactNode } from 'react';
import TodaySection from '@/components/today/TodaySection';
import TodayLeadRow from '@/components/today/TodayLeadRow';
import TodayTaskRow from '@/components/today/TodayTaskRow';
import type { TodayData, TodayLeadItem, TodayTaskItem } from '@/types/today';

interface TodayBoardProps {
  data: TodayData;
  currentUserId: string;
  isAdmin: boolean;
}

export default function TodayBoard({ data, currentUserId, isAdmin }: TodayBoardProps): ReactNode {
  const totalItems =
    data.newLeads.total +
    data.unprocessedLeads.total +
    data.tasksToday.total +
    data.overdueTasks.total +
    data.leadsWithoutNextAction.total +
    data.leadsApproachingDeadline.total +
    data.leadsAtRisk.total;

  if (totalItems === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-[12px] border border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] py-16">
        <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
          На сегодня всё сделано
        </p>
        <p className="text-[13px] text-[var(--color-text-tertiary)]">Новых лидов и задач нет</p>
      </div>
    );
  }

  const renderLead = (lead: TodayLeadItem): ReactNode => (
    <TodayLeadRow lead={lead} currentUserId={currentUserId} isAdmin={isAdmin} />
  );

  const renderTask = (task: TodayTaskItem): ReactNode => <TodayTaskRow task={task} />;

  return (
    <div className="flex flex-col gap-4">
      <TodaySection
        title="Новые лиды"
        items={data.newLeads.items}
        total={data.newLeads.total}
        renderRow={renderLead}
        moreHref="/leads"
        layout="grid"
      />
      <TodaySection
        title="Необработанные лиды"
        items={data.unprocessedLeads.items}
        total={data.unprocessedLeads.total}
        renderRow={renderLead}
        moreHref="/leads"
        layout="grid"
      />
      <TodaySection
        title="Требуют вмешательства"
        items={data.leadsAtRisk.items}
        total={data.leadsAtRisk.total}
        renderRow={renderLead}
        moreHref="/leads"
        layout="grid"
      />
      <TodaySection
        title="Скоро станут просроченными"
        items={data.leadsApproachingDeadline.items}
        total={data.leadsApproachingDeadline.total}
        renderRow={renderLead}
        moreHref="/leads"
        layout="grid"
      />
      <TodaySection
        title="Без следующего действия"
        items={data.leadsWithoutNextAction.items}
        total={data.leadsWithoutNextAction.total}
        renderRow={renderLead}
        moreHref="/leads"
        layout="grid"
      />
      <TodaySection
        title="Задачи на сегодня"
        items={data.tasksToday.items}
        total={data.tasksToday.total}
        renderRow={renderTask}
      />
      <TodaySection
        title="Просроченные задачи"
        items={data.overdueTasks.items}
        total={data.overdueTasks.total}
        renderRow={renderTask}
      />
    </div>
  );
}
