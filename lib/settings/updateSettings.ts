import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { parseCompanySettings, toPublicSettings, type PublicCompanySettings } from '@/lib/settings/getSettings';
import type { UpdateSettingsInput } from '@/lib/validations/settings';

function mergeOverrideMap(
  current: Record<string, number> | undefined,
  patch: Record<string, number | null> | undefined,
): Record<string, number> | undefined {
  if (!patch) {
    return current;
  }

  const merged = { ...current };

  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  }

  return merged;
}

export async function updateSettings(
  companyId: string,
  patch: UpdateSettingsInput,
): Promise<PublicCompanySettings> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { settings: true },
  });

  const current = parseCompanySettings(company.settings);

  const merged = {
    ...current,
    ...patch,
    reactionNorms: patch.reactionNorms
      ? {
          ...current.reactionNorms,
          ...patch.reactionNorms,
          bySource: mergeOverrideMap(current.reactionNorms.bySource, patch.reactionNorms.bySource),
          byStage: mergeOverrideMap(current.reactionNorms.byStage, patch.reactionNorms.byStage),
          byUser: mergeOverrideMap(current.reactionNorms.byUser, patch.reactionNorms.byUser),
        }
      : current.reactionNorms,
    sourceEnabled: patch.sourceEnabled
      ? { ...current.sourceEnabled, ...patch.sourceEnabled }
      : current.sourceEnabled,
  };

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: { settings: merged as Prisma.InputJsonValue },
    select: { settings: true },
  });

  return toPublicSettings(parseCompanySettings(updated.settings));
}
