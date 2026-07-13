import 'server-only';

import { SOURCE_HEALTH_WARNING_RATIO, type SourceHealthStatus } from '@/constants/integrations';
import { prisma } from '@/lib/prisma';
import { getSettings } from '@/lib/settings/getSettings';

const MS_PER_HOUR = 60 * 60 * 1000;

export type SourceHealthEntry = {
  type: string;
  label: string;
  apiKeyName: string | null;
  status: SourceHealthStatus;
  lastUsedAt: string | null;
  lastErrorAt: string | null;
  errorCount: number;
  hoursSinceLastUse: number | null;
  thresholdHours: number;
};

type Candidate = { type: string; label: string; apiKeyName: string | null };

function computeStatus(
  lastUsedAt: Date | null,
  thresholdHours: number,
  now: Date,
): { status: SourceHealthStatus; hoursSinceLastUse: number | null } {
  if (!lastUsedAt) return { status: 'not_configured', hoursSinceLastUse: null };

  const hoursSinceLastUse = (now.getTime() - lastUsedAt.getTime()) / MS_PER_HOUR;
  const warningThresholdHours = thresholdHours * SOURCE_HEALTH_WARNING_RATIO;

  if (hoursSinceLastUse > thresholdHours) return { status: 'down', hoursSinceLastUse };
  if (hoursSinceLastUse >= warningThresholdHours) return { status: 'silent', hoursSinceLastUse };
  return { status: 'active', hoursSinceLastUse };
}

/**
 * Read-only: статус вычисляется на лету из `IntegrationSource`, ничего не пишет в БД.
 * Кандидаты — не только уже существующие записи `IntegrationSource` (иначе источник,
 * с которого ещё не было ни одной заявки, выпал бы из ответа вместо ⚪): два фиксированных
 * источника (tilda/wordpress) + по одному на каждый `ApiKey.sourceLabel` компании.
 */
export async function getSourceHealth(
  companyId: string,
  now: Date = new Date(),
): Promise<SourceHealthEntry[]> {
  const [settings, apiKeys, sources] = await Promise.all([
    getSettings(companyId),
    prisma.apiKey.findMany({
      where: { companyId },
      select: { name: true, sourceLabel: true },
    }),
    prisma.integrationSource.findMany({
      where: { companyId },
      select: { type: true, label: true, lastUsedAt: true, lastErrorAt: true, errorCount: true },
    }),
  ]);

  // `ApiKey.sourceLabel` не уникален — несколько ключей могут делить один `IntegrationSource`.
  const apiCandidatesByLabel = new Map<string, string | null>();
  for (const key of apiKeys) {
    if (!apiCandidatesByLabel.has(key.sourceLabel)) {
      apiCandidatesByLabel.set(key.sourceLabel, key.name);
    }
  }

  const candidates: Candidate[] = [
    { type: 'tilda', label: '', apiKeyName: null },
    { type: 'wordpress', label: '', apiKeyName: null },
    ...Array.from(apiCandidatesByLabel.entries()).map(([label, apiKeyName]) => ({
      type: 'api',
      label,
      apiKeyName,
    })),
  ];

  const sourceByKey = new Map(sources.map((source) => [`${source.type}::${source.label}`, source]));

  return candidates.map((candidate) => {
    const source = sourceByKey.get(`${candidate.type}::${candidate.label}`);

    // Tilda/WordPress — единственный экземпляр на компанию, тумблер напрямую решает статус.
    // API-ключи выключаются по отдельности (свой тумблер у каждого ApiKey, не у sourceLabel
    // в целом — sourceLabel не уникален) — их «disabled» показывается точечно в ApiKeysTable,
    // не здесь.
    const isDisabledSingleton =
      (candidate.type === 'tilda' && !settings.sourceEnabled.tilda) ||
      (candidate.type === 'wordpress' && !settings.sourceEnabled.wordpress);

    if (isDisabledSingleton) {
      return {
        type: candidate.type,
        label: candidate.label,
        apiKeyName: candidate.apiKeyName,
        status: 'disabled',
        lastUsedAt: source?.lastUsedAt?.toISOString() ?? null,
        lastErrorAt: source?.lastErrorAt?.toISOString() ?? null,
        errorCount: source?.errorCount ?? 0,
        hoursSinceLastUse: null,
        thresholdHours: settings.sourceHealthThresholdHours,
      };
    }

    const { status, hoursSinceLastUse } = computeStatus(
      source?.lastUsedAt ?? null,
      settings.sourceHealthThresholdHours,
      now,
    );

    return {
      type: candidate.type,
      label: candidate.label,
      apiKeyName: candidate.apiKeyName,
      status,
      lastUsedAt: source?.lastUsedAt?.toISOString() ?? null,
      lastErrorAt: source?.lastErrorAt?.toISOString() ?? null,
      errorCount: source?.errorCount ?? 0,
      hoursSinceLastUse,
      thresholdHours: settings.sourceHealthThresholdHours,
    };
  });
}
