import 'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { parseCompanySettings } from '@/lib/settings/getSettings';
import { writeEvent } from '@/lib/events';
import {
  uploadOfflineConversions,
  type MetrikaClientIdType,
  type OfflineConversionRow,
} from '@/lib/integrations/yandex/metrikaApi';

export type MetrikaExportResult = {
  exported: number;
  skippedNoIdentifier: number;
  failedGroups: number;
};

function toJsonRecord(value: Prisma.JsonValue): Record<string, unknown> {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function findCaseInsensitive(record: Record<string, unknown>, key: string): string | null {
  const lowerKey = key.toLowerCase();
  for (const [k, v] of Object.entries(record)) {
    if (k.toLowerCase() !== lowerKey) continue;
    if (v === null || v === undefined) return null;
    const str = String(v).trim();
    return str === '' ? null : str;
  }
  return null;
}

type LeadIdentity = {
  leadId: string;
  qualifiedAt: Date;
  clientIdType: MetrikaClientIdType;
  identifier: string;
};

/**
 * `yclid` (`Lead.marketing.yclid`) в приоритете над `client_id` (`Lead.customFields.client_id`) —
 * оба источника уже существуют независимо от этой фазы (Phase 22 / research Таска 1).
 * Лид без обоих идентификаторов — постоянный тихий skip, не ошибка (штатное большинство
 * лидов: ручной ввод, импорт, сайт без Метрики).
 */
function resolveLeadIdentity(lead: {
  id: string;
  qualifiedAt: Date | null;
  marketing: Prisma.JsonValue;
  customFields: Prisma.JsonValue;
}): LeadIdentity | null {
  if (!lead.qualifiedAt) return null;

  const marketing = toJsonRecord(lead.marketing);
  const yclid = findCaseInsensitive(marketing, 'yclid');
  if (yclid) {
    return { leadId: lead.id, qualifiedAt: lead.qualifiedAt, clientIdType: 'YCLID', identifier: yclid };
  }

  const customFields = toJsonRecord(lead.customFields);
  const clientId = findCaseInsensitive(customFields, 'client_id');
  if (clientId) {
    return { leadId: lead.id, qualifiedAt: lead.qualifiedAt, clientIdType: 'CLIENT_ID', identifier: clientId };
  }

  return null;
}

/**
 * Выгружает QUALIFIED-лиды компании без `metrikaExportedAt` как офлайн-конверсии Метрики.
 * Гейт (подключено + counterId/цель заданы) проверяется здесь, а не только у вызывающего —
 * defense-in-depth на случай отключения интеграции между выборкой компаний в cron-роуте
 * и обработкой конкретной компании. Идемпотентность — через `metrikaExportedAt`; фолбэк —
 * тихий no-op на любую ошибку API (лид остаётся до следующего прогона), лид без
 * идентификатора — постоянный тихий skip, не считается сбоем.
 * `client_id_type` — один на HTTP-запрос: батч разбивается на группы, до 2 запросов за прогон.
 */
export async function exportQualifiedLeads(companyId: string): Promise<MetrikaExportResult> {
  const result: MetrikaExportResult = { exported: 0, skippedNoIdentifier: 0, failedGroups: 0 };

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { metrikaAccessToken: true, settings: true },
  });
  if (!company?.metrikaAccessToken) return result;

  const settings = parseCompanySettings(company.settings);
  const counterId = settings.yandexMetrika?.counterId;
  const qualifiedGoalId = settings.yandexMetrika?.qualifiedGoalId;
  if (!counterId || !qualifiedGoalId) return result;

  const leads = await prisma.lead.findMany({
    where: { companyId, qualification: 'QUALIFIED', metrikaExportedAt: null },
    select: { id: true, qualifiedAt: true, marketing: true, customFields: true },
  });
  if (leads.length === 0) return result;

  const groups = new Map<MetrikaClientIdType, LeadIdentity[]>();

  for (const lead of leads) {
    const identity = resolveLeadIdentity(lead);
    if (!identity) {
      result.skippedNoIdentifier += 1;
      continue;
    }
    const group = groups.get(identity.clientIdType) ?? [];
    group.push(identity);
    groups.set(identity.clientIdType, group);
  }

  for (const [clientIdType, identities] of groups) {
    const rows: OfflineConversionRow[] = identities.map((identity) => ({
      identifier: identity.identifier,
      target: qualifiedGoalId,
      dateTimeSeconds: Math.floor(identity.qualifiedAt.getTime() / 1000),
    }));

    const success = await uploadOfflineConversions(companyId, counterId, clientIdType, rows);
    if (!success) {
      result.failedGroups += 1;
      continue;
    }

    const exportedAt = new Date();
    for (const identity of identities) {
      await prisma.lead.update({
        where: { id: identity.leadId },
        data: { metrikaExportedAt: exportedAt },
      });
      await writeEvent(companyId, 'LEAD_METRIKA_EXPORTED', {
        leadId: identity.leadId,
        payload: { clientIdType, target: qualifiedGoalId },
      });
      result.exported += 1;
    }
  }

  return result;
}
