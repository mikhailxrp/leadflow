import { resolveBindToken } from '@/lib/telegram/bindToken';
import { sendTelegramMessage } from '@/lib/telegram';
import {
  extractStartToken,
  telegramWebhookUpdateSchema,
} from '@/lib/validations/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isSecretValid(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret) return false;

  return request.headers.get('x-telegram-bot-api-secret-token') === secret;
}

/**
 * Всегда 200 на бизнес-провал (невалидное сообщение, просроченный/неизвестный токен) —
 * Telegram ретраит апдейты на не-200 ответ, а нам нечего повторно доставлять. 401 — только
 * при неверном/отсутствующем секрете, это не бизнес-логика, а аутентификация самого вебхука.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isSecretValid(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: true });
  }

  const parsed = telegramWebhookUpdateSchema.safeParse(body);
  if (!parsed.success || !parsed.data.message) {
    return Response.json({ ok: true });
  }

  const token = extractStartToken(parsed.data.message.text);
  if (!token) {
    return Response.json({ ok: true });
  }

  const chatId = String(parsed.data.message.chat.id);

  try {
    const resolved = await resolveBindToken(token, chatId);
    if (resolved) {
      await sendTelegramMessage(chatId, 'Telegram-уведомления подключены.');
    } else {
      await sendTelegramMessage(
        chatId,
        'Ссылка для подключения устарела или уже использована. Запросите новую в профиле.',
      );
    }
  } catch (error) {
    console.error('Failed to resolve Telegram bind token:', error);
  }

  return Response.json({ ok: true });
}
