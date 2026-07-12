import { OTHER_BYSOURCE_KEY, OTHER_SOURCE_TYPES } from '@/constants/leadSources';
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
  const sourceKey = (OTHER_SOURCE_TYPES as readonly string[]).includes(lead.source)
    ? OTHER_BYSOURCE_KEY
    : lead.source;

  const minutes =
    (lead.assignedToId != null ? norms.byUser?.[lead.assignedToId] : undefined) ??
    norms.byStage?.[lead.stageId] ??
    norms.bySource?.[sourceKey] ??
    norms.defaultMinutes;

  return {
    defaultMinutes: minutes,
    reminderBeforePercent: norms.reminderBeforePercent,
    escalateAfterPercent: norms.escalateAfterPercent,
    workHoursOnly: norms.workHoursOnly,
  };
}
