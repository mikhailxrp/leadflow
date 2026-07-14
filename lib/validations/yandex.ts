import { z } from 'zod';

export const yandexCallbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
  error_description: z.string().optional(),
});

export type YandexCallbackQuery = z.infer<typeof yandexCallbackQuerySchema>;
