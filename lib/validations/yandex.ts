import { z } from 'zod';

export const yandexCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
  error_description: z.string().optional(),
});

export type YandexCallbackQuery = z.infer<typeof yandexCallbackQuerySchema>;

export const metrikaCallbackQuerySchema = yandexCallbackQuerySchema;

export type MetrikaCallbackQuery = z.infer<typeof metrikaCallbackQuerySchema>;

/**
 * Настройка Метрики — `counterId`/`qualifiedGoalId` принимаются как непрозрачные строки.
 * Management API не даёт дёшево проверить существование JS-событийной цели заранее —
 * несоответствие обнаружится только при реальной выгрузке (Таск 3), не здесь.
 */
export const metrikaSettingsSchema = z.object({
  counterId: z.string().trim().min(1),
  qualifiedGoalId: z.string().trim().min(1),
});

export type MetrikaSettingsInput = z.infer<typeof metrikaSettingsSchema>;
