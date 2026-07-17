import { NextResponse } from 'next/server';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import { writeEvent } from '@/lib/events';
import {
  exchangeCodeForTokens,
  fetchMetrikaLogin,
  saveMetrikaTokens,
  verifyState,
} from '@/lib/integrations/yandex/metrikaOauth';
import { metrikaCallbackQuerySchema } from '@/lib/validations/yandex';

/**
 * Не NextAuth-провайдер: не вызывает signIn(), опирается на уже существующую
 * company-сессию из cookie. Свой guard — этот путь вне matcher'а proxy.ts.
 * На любой ошибке — редирект, а не JSON (пользователь сидит в браузере
 * посреди внешнего OAuth-редиректа с oauth.yandex.ru).
 */
export async function GET(request: Request): Promise<Response> {
  const { origin, searchParams } = new URL(request.url);
  const loginUrl = new URL('/login', origin);
  const integrationsUrl = new URL('/admin/integrations', origin);

  const session = await auth();
  if (!session || session.kind !== 'company' || !session.user) {
    return NextResponse.redirect(loginUrl);
  }

  if (!hasMinRole(session.user.role, 'ADMIN')) {
    return NextResponse.redirect(integrationsUrl);
  }

  const parsed = metrikaCallbackQuerySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) {
    return NextResponse.redirect(integrationsUrl);
  }

  const { code, state, error } = parsed.data;
  if (error || !code || !state) {
    return NextResponse.redirect(integrationsUrl);
  }

  const verified = verifyState(state);
  if (!verified || verified.companyId !== session.user.companyId) {
    return NextResponse.redirect(integrationsUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const login = await fetchMetrikaLogin(tokens.accessToken);
    await saveMetrikaTokens(verified.companyId, tokens, login);
    await writeEvent(verified.companyId, 'METRIKA_CONNECTED', { userId: session.user.id });
  } catch (err) {
    console.error('[GET /api/integrations/yandex/metrika/callback] failed:', err);
    return NextResponse.redirect(integrationsUrl);
  }

  return NextResponse.redirect(integrationsUrl);
}
