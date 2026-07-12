import type { Prisma } from '@prisma/client';

export type CompanySettings = {
  assignMode: 'MANUAL' | 'ROUND_ROBIN';
  roundRobinCursor: string | null;
  telegramEnabled: boolean;
  yandexMode?: 'UTM' | 'FULL';
  controlEnabled: boolean;
  reactionNorms: {
    defaultMinutes: number;
    reminderBeforePercent: number;
    escalateAfterPercent: number;
    bySource?: Record<string, number>;
    byStage?: Record<string, number>;
    byUser?: Record<string, number>;
    workHoursOnly: boolean;
  };
  workHours?: { start: string; end: string; days: number[] };
  stageStuckDaysDefault: number;
  stuckCheckTime: string;
  sourceHealthThresholdHours: number;
};

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  assignMode: 'MANUAL',
  roundRobinCursor: null,
  telegramEnabled: false,
  yandexMode: 'UTM',
  controlEnabled: false,
  reactionNorms: {
    defaultMinutes: 30,
    reminderBeforePercent: 66,
    escalateAfterPercent: 133,
    workHoursOnly: false,
  },
  stageStuckDaysDefault: 5,
  stuckCheckTime: '09:00',
  sourceHealthThresholdHours: 3,
};

export function DEFAULT_STAGES(
  companyId: string,
): Prisma.PipelineStageCreateManyInput[] {
  return [
    { companyId, name: 'Новый лид', color: '#6366f1', order: 1 },
    { companyId, name: 'Квалификация', color: '#3b82f6', order: 2 },
    { companyId, name: 'Переговоры', color: '#f59e0b', order: 3 },
    { companyId, name: 'Предложение', color: '#10b981', order: 4 },
    { companyId, name: 'Закрыт', color: '#6b7280', order: 5 },
  ];
}

const DEFAULT_LOSS_REASON_LABELS = [
  'Дорого',
  'Выбрал конкурента',
  'Не удалось связаться',
  'Нецелевой',
  'Нет бюджета',
  'Отложил',
  'Не подошли условия',
  'Дубль',
  'Другое',
] as const;

export function DEFAULT_LOSS_REASONS(
  companyId: string,
): Prisma.LossReasonCreateManyInput[] {
  return DEFAULT_LOSS_REASON_LABELS.map((label, index) => ({
    companyId,
    label,
    order: index + 1,
  }));
}
