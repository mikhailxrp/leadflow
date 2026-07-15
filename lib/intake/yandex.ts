import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { parseCompanySettings } from '@/lib/settings/getSettings';
import { writeEvent } from '@/lib/events';
import { resolveCampaignName, resolveAdGroupName } from '@/lib/integrations/yandex/directApi';
import { YANDEX_MACRO_FIELDS } from '@/constants/yandexMacros';

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

/**
 * Пост-коммит обогатитель лида данными Яндекс Директа (паттерн `flagPossibleDuplicates`).
 * Гейт: `yandexMode === "FULL"` + кабинет подключён + у лида есть хотя бы один
 * идентификатор Яндекса. Любой сбой — тихий no-op, не бросает исключение наружу
 * и не блокирует/не задерживает вызывающий код.
 */
export async function enrichYandexLead(leadId: string, companyId: string): Promise<void> {
  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { settings: true, yandexAccessToken: true },
    });
    if (!company) return;

    const settings = parseCompanySettings(company.settings);
    if (settings.yandexMode !== 'FULL') return;
    if (!company.yandexAccessToken) return;

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, companyId },
      select: { utm: true, customFields: true, marketing: true },
    });
    if (!lead) return;

    const utm = toJsonRecord(lead.utm);
    const customFields = toJsonRecord(lead.customFields);
    const marketing = toJsonRecord(lead.marketing);

    const findIdentifier = (field: string): string | null =>
      findCaseInsensitive(utm, field) ?? findCaseInsensitive(customFields, field);

    const campaignId = findIdentifier(YANDEX_MACRO_FIELDS.CAMPAIGN_ID);
    const gbid = findIdentifier(YANDEX_MACRO_FIELDS.GBID);
    const keyword = findIdentifier(YANDEX_MACRO_FIELDS.KEYWORD);
    const deviceType = findIdentifier(YANDEX_MACRO_FIELDS.DEVICE_TYPE);
    const regionName = findIdentifier(YANDEX_MACRO_FIELDS.REGION_NAME);
    const yclid = findCaseInsensitive(marketing, 'yclid');

    const hasIdentifier = Boolean(campaignId || gbid || keyword || deviceType || regionName || yclid);
    if (!hasIdentifier) return;

    const yandexData: Record<string, string> = {};

    if (campaignId) {
      const campaignName = await resolveCampaignName(companyId, campaignId);
      if (campaignName) yandexData.campaignName = campaignName;
    }
    if (gbid) {
      const adGroupName = await resolveAdGroupName(companyId, gbid);
      if (adGroupName) yandexData.adGroupName = adGroupName;
    }
    if (keyword) yandexData.keyword = keyword;
    if (deviceType) yandexData.deviceType = deviceType;
    if (regionName) yandexData.regionName = regionName;
    if (yclid) yandexData.yclid = yclid;

    if (Object.keys(yandexData).length === 0) return;

    const updatedMarketing = { ...marketing, yandex: yandexData };

    await prisma.lead.update({
      where: { id: leadId },
      data: { marketing: updatedMarketing as Prisma.InputJsonValue },
    });

    await writeEvent(companyId, 'LEAD_UPDATED', {
      leadId,
      payload: { yandex: yandexData },
    });
  } catch (error) {
    console.error('[enrichYandexLead] failed:', error);
  }
}
