import type { ReactionNorms, RiskInput } from '@/lib/risk/computeRisk';

export function resolveApplicableNorm(
  lead: Pick<RiskInput['lead'], 'assignedToId' | 'stageId' | 'source'>,
  norms: ReactionNorms,
): {
  defaultMinutes: number;
  reminderBeforePercent: number;
  escalateAfterPercent: number;
  workHoursOnly: boolean;
} {
  const minutes =
    (lead.assignedToId != null ? norms.byUser?.[lead.assignedToId] : undefined) ??
    norms.byStage?.[lead.stageId] ??
    norms.bySource?.[lead.source] ??
    norms.defaultMinutes;

  return {
    defaultMinutes: minutes,
    reminderBeforePercent: norms.reminderBeforePercent,
    escalateAfterPercent: norms.escalateAfterPercent,
    workHoursOnly: norms.workHoursOnly,
  };
}
