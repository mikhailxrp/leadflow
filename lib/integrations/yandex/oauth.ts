import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { parseCompanySettings } from '@/lib/settings/getSettings';
import { prisma } from '@/lib/prisma';

const YANDEX_AUTHORIZE_URL = 'https://oauth.yandex.ru/authorize';
const YANDEX_TOKEN_URL = 'https://oauth.yandex.com/token';
const YANDEX_LOGIN_INFO_URL = 'https://login.yandex.ru/info';
const YANDEX_OAUTH_SCOPE = 'direct:api';
const STATE_TTL_MS = 10 * 60 * 1000;

export type YandexTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
};

export type YandexConnectionStatus = {
  connected: boolean;
  login: string | null;
  mode: 'UTM' | 'FULL';
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function signStatePayload(payloadEncoded: string): string {
  return createHmac('sha256', requireEnv('AUTH_SECRET')).update(payloadEncoded).digest('hex');
}

/** Строит authorize-URL со свежим подписанным `state` (HMAC + TTL, содержит `companyId`). */
export function buildAuthorizeUrl(companyId: string): string {
  const payload = JSON.stringify({
    companyId,
    ts: Date.now(),
    nonce: randomBytes(8).toString('hex'),
  });
  const payloadEncoded = Buffer.from(payload).toString('base64url');
  const signature = signStatePayload(payloadEncoded);
  const state = `${payloadEncoded}.${signature}`;

  const url = new URL(YANDEX_AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', requireEnv('YANDEX_OAUTH_CLIENT_ID'));
  url.searchParams.set('redirect_uri', requireEnv('YANDEX_OAUTH_REDIRECT_URI'));
  url.searchParams.set('scope', YANDEX_OAUTH_SCOPE);
  url.searchParams.set('state', state);
  return url.toString();
}

/** Проверяет подпись и срок жизни `state`, возвращает встроенный `companyId` либо `null`. */
export function verifyState(state: string): { companyId: string } | null {
  try {
    const separatorIndex = state.lastIndexOf('.');
    if (separatorIndex === -1) return null;

    const payloadEncoded = state.slice(0, separatorIndex);
    const signature = state.slice(separatorIndex + 1);
    const expectedSignature = signStatePayload(payloadEncoded);

    const signatureBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    if (
      signatureBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8')) as {
      companyId?: unknown;
      ts?: unknown;
    };

    if (typeof payload.companyId !== 'string' || typeof payload.ts !== 'number') return null;
    if (Date.now() - payload.ts > STATE_TTL_MS) return null;

    return { companyId: payload.companyId };
  } catch {
    return null;
  }
}

async function requestTokens(body: URLSearchParams): Promise<YandexTokens> {
  const response = await fetch(YANDEX_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Yandex token endpoint responded with ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/** Обменивает код авторизации на пару токенов. */
export async function exchangeCodeForTokens(code: string): Promise<YandexTokens> {
  return requestTokens(
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: requireEnv('YANDEX_OAUTH_CLIENT_ID'),
      client_secret: requireEnv('YANDEX_OAUTH_CLIENT_SECRET'),
    }),
  );
}

/**
 * Обновляет access-токен. Яндекс ротирует refresh-токен на каждый вызов —
 * оба поля результата обязательно перезаписывать, не только accessToken.
 */
export async function refreshAccessToken(refreshToken: string): Promise<YandexTokens> {
  return requestTokens(
    new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: requireEnv('YANDEX_OAUTH_CLIENT_ID'),
      client_secret: requireEnv('YANDEX_OAUTH_CLIENT_SECRET'),
    }),
  );
}

/** Best-effort: логин кабинета для отображения. Любая ошибка → `null`, не бросает исключение. */
export async function fetchYandexLogin(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch(`${YANDEX_LOGIN_INFO_URL}?format=json`, {
      headers: { Authorization: `OAuth ${accessToken}` },
    });
    if (!response.ok) return null;

    const data = (await response.json()) as { login?: unknown };
    return typeof data.login === 'string' ? data.login : null;
  } catch {
    return null;
  }
}

/** Записывает токены + логин на `Company` (server-only колонки). */
export async function saveYandexTokens(
  companyId: string,
  tokens: YandexTokens,
  login: string | null,
): Promise<void> {
  await prisma.company.update({
    where: { id: companyId },
    data: {
      yandexAccessToken: tokens.accessToken,
      yandexRefreshToken: tokens.refreshToken,
      yandexTokenExpiresAt: tokens.expiresAt,
      yandexLogin: login,
    },
  });
}

/** Очищает все 4 server-only поля токенов Яндекса на `Company`. */
export async function disconnectYandex(companyId: string): Promise<void> {
  await prisma.company.update({
    where: { id: companyId },
    data: {
      yandexAccessToken: null,
      yandexRefreshToken: null,
      yandexTokenExpiresAt: null,
      yandexLogin: null,
    },
  });
}

/** Статус подключения без единого поля токена — безопасен для отдачи клиенту. */
export async function getYandexConnectionStatus(companyId: string): Promise<YandexConnectionStatus> {
  const company = await prisma.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { yandexAccessToken: true, yandexLogin: true, settings: true },
  });

  const settings = parseCompanySettings(company.settings);

  return {
    connected: Boolean(company.yandexAccessToken),
    login: company.yandexLogin,
    mode: settings.yandexMode ?? 'UTM',
  };
}
