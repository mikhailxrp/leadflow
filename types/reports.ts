import type { RiskReasonCode } from '@/lib/risk/computeRisk';

export type { RiskReasonCode };

export type ReportPeriod = {
  from: string;
  to: string;
};

export type LeadsBucket = {
  date: string;
  count: number;
};

export type StageConversionRow = {
  stageId: string;
  name: string;
  order: number;
  count: number;
};

export type BySourceRow = {
  source: string;
  count: number;
  wonRate: number;
};

export type LossReasonRow = {
  lossReasonId: string | null;
  label: string;
  count: number;
};

/**
 * unprocessed/stuck/withoutNextAction — текущий срез по ВСЕМ открытым лидам компании,
 * не выборка за from…to (см. фикс №4 в phase-21.md). Взаимоисключающие приоритетные
 * бакеты, как и цвет риска везде в приложении (risk.md): лид, подпадающий под несколько
 * условий одновременно, считается один раз — в бакете своей самой значимой причины
 * (RiskReasonCode). unprocessed = NO_ASSIGNEE + NO_FIRST_RESPONSE (никто не ответил
 * лиду); stuck = STAGE_STUCK; withoutNextAction = NO_NEXT_ACTION. Поэтому сумма трёх
 * чисел не равна «все открытые лиды с любой проблемой».
 */
export type AdSpendRecord = {
  id: string;
  year: number;
  month: number;
  amountWithVat: number;
  note: string | null;
};

/**
 * Финансовый блок (Phase 22.7, Таск 4) — 10 метрик на единой когорте лидов по
 * `createdAt` (не по `closedAt`, см. lib/reports/getFinancials.ts). Доли и ROMI —
 * уже в процентной шкале (0..100), в отличие от wonRate (дробь 0..1) в этом же
 * модуле — формулы фазы явно включают ×100. Деление на ноль → null, не 0.
 */
export type FinancialReport = {
  adSpend: number;
  totalLeads: number;
  costPerLead: number | null;
  qualifiedLeads: number;
  costPerQualifiedLead: number | null;
  qualifiedRate: number | null;
  revenueInProgress: number;
  revenueCollected: number;
  totalRevenue: number;
  romi: number | null;
};

export type ReportSummary = {
  totalLeads: number;
  buckets: LeadsBucket[];
  avgFirstResponseMinutes: number | null;
  unprocessed: number;
  stuck: number;
  withoutNextAction: number;
  /** count — cumulative: лиды, когда-либо достигшие этапа, не снимок «сейчас в нём». */
  conversionByStage: StageConversionRow[];
  wonRate: number;
};
