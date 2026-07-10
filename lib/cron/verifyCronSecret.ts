import { cronAuthSchema } from '@/lib/validations/cron';

/**
 * Проверка машинных cron-эндпоинтов (без сессии): секрет передаётся заголовком
 * `Authorization: Bearer <secret>`, заголовком `x-cron-secret` или query `?key=` —
 * все три формы равнозначны, поддерживать нужно все сразу.
 * Используется /api/platform/cron/subscription-reminders и /api/cron/reminders.
 */
export function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }

  const authParse = cronAuthSchema.safeParse({
    authorization: request.headers.get('authorization') ?? undefined,
    xCronSecret: request.headers.get('x-cron-secret') ?? undefined,
    key: new URL(request.url).searchParams.get('key') ?? undefined,
  });

  if (!authParse.success) {
    return false;
  }

  const { authorization, xCronSecret, key } = authParse.data;

  if (authorization?.startsWith('Bearer ')) {
    const token = authorization.slice('Bearer '.length);
    if (token === secret) {
      return true;
    }
  }

  if (xCronSecret === secret) {
    return true;
  }

  if (key === secret) {
    return true;
  }

  return false;
}
