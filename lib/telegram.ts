import 'server-only';

const TELEGRAM_API_BASE = 'https://api.telegram.org';

/**
 * Plain-text send — no parse_mode, callers must not rely on Markdown/HTML escaping.
 * Missing TELEGRAM_BOT_TOKEN and any network/API failure are swallowed (logged, not thrown):
 * lead intake must never fail because Telegram delivery failed.
 */
export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

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
