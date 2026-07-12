import type { NextAction } from '@/lib/tasks/getNextActions';
import type { RiskResult } from '@/lib/risk/computeRisk';
import type { LeadListItem } from '@/lib/leads/getLeads';

export type TodayBlock<T> = {
  items: T[];
  total: number;
};

export type TodayLeadItem = LeadListItem & {
  risk: RiskResult;
  nextAction: NextAction;
};

export type TodayTaskItem = {
  id: string;
  title: string;
  dueDate: string | null;
  leadId: string;
  leadName: string | null;
};

export type TodayData = {
  newLeads: TodayBlock<TodayLeadItem>;
  unprocessedLeads: TodayBlock<TodayLeadItem>;
  tasksToday: TodayBlock<TodayTaskItem>;
  overdueTasks: TodayBlock<TodayTaskItem>;
  leadsWithoutNextAction: TodayBlock<TodayLeadItem>;
  leadsApproachingDeadline: TodayBlock<TodayLeadItem>;
  leadsAtRisk: TodayBlock<TodayLeadItem>;
};
