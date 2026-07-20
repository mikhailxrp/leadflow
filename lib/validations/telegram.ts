import { z } from 'zod';

/**
 * Узкий разбор апдейта Telegram Bot API — интересует только текст и chat.id сообщения.
 * Прочие типы апдейтов (edited_message, callback_query, ...) проходят как объект без
 * `message` и просто не дают совпадения ниже по стеку — но `update_id` читается всегда,
 * чтобы воркер сдвинул offset и не зациклился на неподходящих апдейтах.
 */
const telegramMessageSchema = z.object({
  text: z.string().optional(),
  chat: z.object({
    id: z.number(),
  }),
});

export const telegramUpdateSchema = z.object({
  update_id: z.number(),
  message: telegramMessageSchema.optional(),
});

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;

/** Ответ метода getUpdates. `result` отсутствует при `ok: false` — приводим к пустому массиву. */
export const telegramGetUpdatesResponseSchema = z.object({
  ok: z.boolean(),
  result: z.array(telegramUpdateSchema).optional().default([]),
});

const START_COMMAND_PATTERN = /^\/start\s+(\S+)/;

/** Возвращает токен из `/start <token>`, либо null — если сообщение не тот формат. */
export function extractStartToken(text: string | undefined): string | null {
  if (!text) return null;
  const match = START_COMMAND_PATTERN.exec(text.trim());
  return match ? match[1] : null;
}
