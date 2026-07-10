import { z } from 'zod';

/**
 * Узкий разбор апдейта Telegram Bot API — интересует только текст и chat.id сообщения.
 * Всё остальное (edited_message, callback_query, произвольные поля) проходит парсинг
 * как unknown-объект и просто не даёт совпадения ниже по стеку — не 500.
 */
export const telegramWebhookUpdateSchema = z.object({
  message: z
    .object({
      text: z.string().optional(),
      chat: z.object({
        id: z.number(),
      }),
    })
    .optional(),
});

export type TelegramWebhookUpdate = z.infer<typeof telegramWebhookUpdateSchema>;

const START_COMMAND_PATTERN = /^\/start\s+(\S+)/;

/** Возвращает токен из `/start <token>`, либо null — если сообщение не тот формат. */
export function extractStartToken(text: string | undefined): string | null {
  if (!text) return null;
  const match = START_COMMAND_PATTERN.exec(text.trim());
  return match ? match[1] : null;
}
