const TELEGRAM_API_BASE = 'https://api.telegram.org';

function getBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN ?? null;
}

/**
 * Plain-text send — no parse_mode, callers must not rely on Markdown/HTML escaping.
 * Missing TELEGRAM_BOT_TOKEN and any network/API failure are swallowed (logged, not thrown):
 * lead intake / notifications must never fail because Telegram delivery failed.
 *
 * Модуль намеренно БЕЗ `import 'server-only'`: он переиспользуется и в Next-приложении
 * (через тонкую обёртку `lib/telegram.ts`, которая и держит server-only-гейт), и в отдельном
 * polling-воркере (`scripts/telegramPolling.ts`), запускаемом вне бандла Next через tsx —
 * там `server-only` резолвится в бросающий index.js и упал бы прямо на импорте.
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const token = getBotToken();

  if (!token) {
    console.log('[telegram] TELEGRAM_BOT_TOKEN is not set, skipping sendMessage');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    });

    if (!response.ok) {
      console.error('[telegram] sendMessage failed', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('[telegram] sendMessage error', error);
    return false;
  }
}

/**
 * Снимает webhook у бота. getUpdates (long polling) и webhook взаимоисключающи — пока
 * webhook зарегистрирован, Telegram отвечает на getUpdates ошибкой 409 Conflict. Воркер
 * вызывает это один раз при старте. `drop_pending_updates: false` — не терять апдейты,
 * присланные до старта воркера (напр. только что отправленный `/start <token>`).
 */
export async function deleteWebhook(): Promise<boolean> {
  const token = getBotToken();

  if (!token) {
    console.log('[telegram] TELEGRAM_BOT_TOKEN is not set, skipping deleteWebhook');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/deleteWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ drop_pending_updates: false }),
    });

    if (!response.ok) {
      console.error('[telegram] deleteWebhook failed', response.status, await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('[telegram] deleteWebhook error', error);
    return false;
  }
}

/**
 * Один long-poll-запрос getUpdates. Возвращает сырой JSON Bot API (валидируется вызывающим
 * через zod). Бросает на сетевой ошибке и на не-2xx (в т.ч. 409 Conflict — если параллельно
 * работает второй воркер на том же токене или остался незакрытый webhook): воркер это логирует
 * и делает backoff. AbortSignal с запасом над серверным long-poll timeout защищает от зависшего
 * соединения (иначе fetch без таймаута мог бы висеть бесконечно).
 */
export async function getUpdates(
  offset: number | undefined,
  timeoutSeconds: number,
): Promise<unknown> {
  const token = getBotToken();

  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN is not set');
  }

  const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/getUpdates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      offset,
      timeout: timeoutSeconds,
      allowed_updates: ['message'],
    }),
    signal: AbortSignal.timeout((timeoutSeconds + 15) * 1000),
  });

  if (!response.ok) {
    throw new Error(`getUpdates HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json();
}

/** Диагностический getMe — username бота в лог при старте воркера. null при любой ошибке. */
export async function getBotUsername(): Promise<string | null> {
  const token = getBotToken();
  if (!token) return null;

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/getMe`);
    if (!response.ok) return null;
    const data = (await response.json()) as { result?: { username?: string } };
    return data.result?.username ?? null;
  } catch {
    return null;
  }
}
