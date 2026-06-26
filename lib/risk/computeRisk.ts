import { resolveApplicableNorm } from '@/lib/risk/resolveApplicableNorm';
import { minutesSinceCreated } from '@/lib/risk/workHoursUtils';

const MS_PER_DAY = 86_400_000;

export type RiskLevel = 'green' | 'yellow' | 'red' | 'grey';

export interface RiskResult {
  level: RiskLevel;
  reason: string | null;
}

export interface ReactionNorms {
  defaultMinutes: number;
  reminderBeforePercent: number;
  bySource?: Record<string, number>;
  byStage?: Record<string, number>;
  byUser?: Record<string, number>;
  workHoursOnly: boolean;
}

export interface RiskInput {
  lead: {
    id: string;
    closeType: 'WON' | 'LOST' | null;
    assignedToId: string | null;
    createdAt: Date;
    source: string;
    stageId: string;
  };
  hasTakenInWork: boolean;
  lastStageChangedAt: Date;
  currentStage: { stageTimeLimitDays: number | null };
  companySettings: {
    stageStuckDaysDefault: number;
    reactionNorms: ReactionNorms;
    workHours?: { start: string; end: string; days: number[] };
  };
  hasOpenTask: boolean;
  overdueOpenTask: { title: string } | null;
  now?: Date;
}

export function computeRisk(input: RiskInput): RiskResult {
  const now = input.now ?? new Date();

  if (input.lead.closeType === 'WON') {
    return { level: 'grey', reason: 'Закрыт: сделка' };
  }

  if (input.lead.closeType === 'LOST') {
    return { level: 'grey', reason: 'Закрыт: отказ' };
  }

  if (!input.lead.assignedToId) {
    return { level: 'red', reason: 'Нет ответственного' };
  }

  const norm = resolveApplicableNorm(input.lead, input.companySettings.reactionNorms);
  const elapsedMinutes = minutesSinceCreated(
    input.lead.createdAt,
    now,
    norm.workHoursOnly,
  );

  if (!input.hasTakenInWork && elapsedMinutes > norm.defaultMinutes) {
    return {
      level: 'red',
      reason: `Нет первого ответа ${Math.floor(elapsedMinutes)} минут`,
    };
  }

  const stageLimit =
    input.currentStage.stageTimeLimitDays ?? input.companySettings.stageStuckDaysDefault;
  const daysOnStage = Math.floor(
    (now.getTime() - input.lastStageChangedAt.getTime()) / MS_PER_DAY,
  );

  if (daysOnStage > stageLimit) {
    return { level: 'red', reason: `${daysOnStage} дней на этапе` };
  }

  if (input.overdueOpenTask != null) {
    return {
      level: 'yellow',
      reason: `Просрочена задача: ${input.overdueOpenTask.title}`,
    };
  }

  if (!input.hasOpenTask) {
    return { level: 'yellow', reason: 'Нет следующего шага' };
  }

  const warningThreshold =
    norm.defaultMinutes * (norm.reminderBeforePercent / 100);

  if (!input.hasTakenInWork && elapsedMinutes > warningThreshold) {
    return { level: 'yellow', reason: 'Приближается срок первого ответа' };
  }

  return { level: 'green', reason: null };
}
