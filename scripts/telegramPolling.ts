import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '@/lib/prisma';
import {
  deleteWebhook,
  getBotUsername,
  getUpdates,
  sendTelegramMessage,
} from '@/lib/telegram/client';
import { resolveBindToken } from '@/lib/telegram/resolveBindToken';
import {
  extractStartToken,
  telegramGetUpdatesResponseSchema,
  type TelegramUpdate,
} from '@/lib/validations/telegram';

/**
 * Telegram bot worker (long polling).
 *
 * Зачем polling, а не webhook: в РФ входящие соединения от серверов Telegram к VPS
 * (webhook) блокируются/рвутся, тогда как исходящие запросы к api.telegram.org работают.
 * Long polling опирается ТОЛЬКО на исходящий канал — воркер сам держит getUpdates.
 *
 * Запуск: отдельный процесс `npm run bot:telegram` под PM2 (НЕ Route Handler Next).
 * Один процесс на окружение (dev/prod) — у каждого свой бот и свой .env, потому что
 * getUpdates эксклюзивен на токен (два воркера на одном токене → 409 Conflict).
 *
 * Логика привязки не менялась: /start <token> → resolveBindToken → подтверждение.
 */

const LONG_POLL_TIMEOUT_SECONDS = 30;
const ERROR_BACKOFF_MS = 5_000;

const CONNECTED_MESSAGE = 'Telegram-уведомления подключены.';
const EXPIRED_MESSAGE =
  'Ссылка для подключения устарела или уже использована. Запросите новую в профиле.';

let running = true;
let offset: number | undefined;

/**
 * tsx не подхватывает .env автоматически (в отличие от Next). Тот же лоадер, что в
 * scripts/bootstrapPlatformAdmin.ts — читает .env из cwd, не перезатирая уже заданные env
 * (напр. если PM2 сам прокинул переменные).
 */
function loadEnvFile(): void {
  try {
    const content = readFileSync(resolve(process.cwd(), '.env'), 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;

      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed
        .slice(eqIndex + 1)
        .trim()
        .replace(/^["']|["']$/g, '');

      if (!(key in process.env)) process.env[key] = value;
    }
  } catch {
    // .env опционален, если переменные уже заданы в окружении
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function handleUpdate(update: TelegramUpdate): Promise<void> {
  const token = extractStartToken(update.message?.text);
  if (!token || !update.message) return;

  const chatId = String(update.message.chat.id);
  try {
    const resolved = await resolveBindToken(token, chatId);
    await sendTelegramMessage(chatId, resolved ? CONNECTED_MESSAGE : EXPIRED_MESSAGE);
  } catch (error) {
    console.error('[telegram-bot] ошибка привязки токена:', error);
  }
}

async function pollOnce(): Promise<void> {
  const raw = await getUpdates(offset, LONG_POLL_TIMEOUT_SECONDS);
  const parsed = telegramGetUpdatesResponseSchema.safeParse(raw);

  if (!parsed.success || !parsed.data.ok) {
    console.error(
      '[telegram-bot] некорректный ответ getUpdates:',
      JSON.stringify(raw).slice(0, 500),
    );
    await sleep(ERROR_BACKOFF_MS);
    return;
  }

  for (const update of parsed.data.result) {
    await handleUpdate(update);
    // Сдвигаем offset после обработки: следующий getUpdates заберёт только более новые
    // апдейты — этот считается подтверждённым, и Telegram его больше не пришлёт.
    offset = update.update_id + 1;
  }
}

async function main(): Promise<void> {
  loadEnvFile();

  if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('[telegram-bot] TELEGRAM_BOT_TOKEN не задан — нечего опрашивать, выход');
    process.exit(1);
  }

  // Webhook и long polling взаимоисключающи — снимаем webhook, если он был зарегистрирован,
  // иначе первый же getUpdates вернёт 409 Conflict.
  await deleteWebhook();

  const username = await getBotUsername();
  console.log(
    `[telegram-bot] запущен, бот @${username ?? 'неизвестен'}, long polling ${LONG_POLL_TIMEOUT_SECONDS}s`,
  );

  while (running) {
    try {
      await pollOnce();
    } catch (error) {
      console.error(`[telegram-bot] ошибка опроса, backoff ${ERROR_BACKOFF_MS} мс:`, error);
      await sleep(ERROR_BACKOFF_MS);
    }
  }
}

async function shutdown(signal: string): Promise<void> {
  console.log(`[telegram-bot] ${signal} — останавливаюсь`);
  running = false;
  try {
    await prisma.$disconnect();
  } catch {
    // игнорируем ошибку дисконнекта при завершении процесса
  }
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

main().catch((error: unknown) => {
  console.error('[telegram-bot] фатальная ошибка:', error);
  process.exit(1);
});
