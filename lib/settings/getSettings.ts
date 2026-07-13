import type { Prisma } from '@prisma/client';
import {
  DEFAULT_COMPANY_SETTINGS,
  type CompanySettings,
} from '@/constants/defaultCompanyData';
import { prisma } from '@/lib/prisma';

export function parseCompanySettings(settings: Prisma.JsonValue): CompanySettings {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return DEFAULT_COMPANY_SETTINGS;
  }

  const raw = settings as Partial<CompanySettings>;

  return {
    ...DEFAULT_COMPANY_SETTINGS,
    ...raw,
    reactionNorms: {
      ...DEFAULT_COMPANY_SETTINGS.reactionNorms,
      ...raw.reactionNorms,
      bySource: raw.reactionNorms?.bySource ?? DEFAULT_COMPANY_SETTINGS.reactionNorms.bySource,
      byStage: raw.reactionNorms?.byStage ?? DEFAULT_COMPANY_SETTINGS.reactionNorms.byStage,
      byUser: raw.reactionNorms?.byUser ?? DEFAULT_COMPANY_SETTINGS.reactionNorms.byUser,
    },
    sourceEnabled: {
      ...DEFAULT_COMPANY_SETTINGS.sourceEnabled,
      ...raw.sourceEnabled,
    },
  };
}

export type PublicCompanySettings = Omit<CompanySettings, 'roundRobinCursor'>;

export function toPublicSettings(settings: CompanySettings): PublicCompanySettings {
  const { roundRobinCursor, ...rest } = settings;
  void roundRobinCursor;
  return rest;
}

export async function getSettings(companyId: string): Promise<PublicCompanySettings> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { settings: true },
  });

  return toPublicSettings(parseCompanySettings(company.settings));
}
