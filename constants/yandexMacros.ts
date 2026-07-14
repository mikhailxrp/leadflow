/**
 * Имена скрытых полей формы для передачи макросов Яндекс Директа — совпадают
 * с именем макроса без фигурных скобок (напр. `{campaign_id}` → поле `campaign_id`).
 * Конвенция едина для обогащения (`lib/intake/yandex.ts`) и для инструкции
 * подключения источника, которую видит клиент (Phase 22, Таск 4).
 *
 * `yclid` в список не входит — он уже распознаётся `constants/fieldAliases.ts`
 * (`MARKETING_FIELDS`) при приёме и уходит в `Lead.marketing.yclid` до обогащения.
 */
export const YANDEX_MACRO_FIELDS = {
  CAMPAIGN_ID: 'campaign_id',
  GBID: 'gbid',
  KEYWORD: 'keyword',
  DEVICE_TYPE: 'device_type',
  REGION_NAME: 'region_name',
} as const;
