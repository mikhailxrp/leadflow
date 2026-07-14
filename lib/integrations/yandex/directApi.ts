import { prisma } from '@/lib/prisma';
import { refreshAccessToken, saveYandexTokens } from '@/lib/integrations/yandex/oauth';

const DIRECT_API_BASE_URL = 'https://api.direct.yandex.com/json/v5';

type DirectApiRequest = {
  method: string;
  params: Record<string, unknown>;
};

type DirectApiEnvelope<T> = {
  result?: T;
  error?: { error_code?: number; error_string?: string; error_detail?: string };
};

type StoredYandexTokens = {
  accessToken: string;
  refreshToken: string;
  login: string | null;
};

async function getStoredTokens(companyId: string): Promise<StoredYandexTokens | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { yandexAccessToken: true, yandexRefreshToken: true, yandexLogin: true },
  });

  if (!company?.yandexAccessToken || !company.yandexRefreshToken) return null;

  return {
    accessToken: company.yandexAccessToken,
    refreshToken: company.yandexRefreshToken,
    login: company.yandexLogin,
  };
}

/** Яндекс: невалидный/просроченный/отозванный OAuth-токен — сигнал для авто-refresh. */
const AUTH_ERROR_CODE = 53;

type DirectApiAttempt<T> = { status: number; data: DirectApiEnvelope<T> };

/**
 * Один HTTP-запрос к Direct API. Не бросает на `!response.ok` — авторизационная
 * ошибка Яндекса приходит и как `401`, и как `200 OK` с `error.error_code === 53`
 * в теле (подтверждено живым запросом с невалидным токеном) — решение о том, что
 * считать сбоем авторизации, принимает вызывающий код (`isAuthError`).
 */
async function postToDirectApi<T>(
  service: string,
  accessToken: string,
  body: DirectApiRequest,
): Promise<DirectApiAttempt<T>> {
  const response = await fetch(`${DIRECT_API_BASE_URL}/${service}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok && response.status !== 401) {
    throw new Error(`Yandex Direct API responded with ${response.status} for ${service}.${body.method}`);
  }

  const data = (await response.json()) as DirectApiEnvelope<T>;
  return { status: response.status, data };
}

function isAuthError<T>(attempt: DirectApiAttempt<T>): boolean {
  return attempt.status === 401 || attempt.data.error?.error_code === AUTH_ERROR_CODE;
}

/**
 * Bearer-запрос к Direct API v5 с одним авто-refresh на сбой авторизации
 * (`401` или `error_code: 53` — оба варианта встречаются у Яндекса на практике,
 * не логирует токен). Ротация refresh-токена Яндекса — при обновлении
 * перезаписываются оба поля, `yandexLogin` переносится без изменений.
 */
async function callDirectApi<T>(
  companyId: string,
  service: string,
  body: DirectApiRequest,
): Promise<T> {
  const tokens = await getStoredTokens(companyId);
  if (!tokens) {
    throw new Error(`Yandex Direct: no stored tokens for company ${companyId}`);
  }

  let attempt = await postToDirectApi<T>(service, tokens.accessToken, body);

  if (isAuthError(attempt)) {
    const refreshed = await refreshAccessToken(tokens.refreshToken);
    await saveYandexTokens(companyId, refreshed, tokens.login);
    attempt = await postToDirectApi<T>(service, refreshed.accessToken, body);
  }

  if (attempt.data.error) {
    throw new Error(
      `Yandex Direct API error ${attempt.data.error.error_code ?? '?'}: ${attempt.data.error.error_string ?? 'unknown'}`,
    );
  }

  if (!attempt.data.result) {
    throw new Error(`Yandex Direct API returned no result for ${service}.${body.method}`);
  }

  return attempt.data.result;
}

/** Резолв `{campaign_id}` → название кампании. `null` — кампания не найдена/нет доступа. */
export async function resolveCampaignName(companyId: string, campaignId: string): Promise<string | null> {
  const id = Number(campaignId);
  if (!Number.isFinite(id)) return null;

  const result = await callDirectApi<{ Campaigns?: Array<{ Id: number; Name: string }> }>(
    companyId,
    'campaigns',
    { method: 'get', params: { SelectionCriteria: { Ids: [id] }, FieldNames: ['Id', 'Name'] } },
  );

  return result.Campaigns?.[0]?.Name ?? null;
}

/** Резолв `{gbid}` → название группы объявлений. `null` — группа не найдена/нет доступа. */
export async function resolveAdGroupName(companyId: string, gbid: string): Promise<string | null> {
  const id = Number(gbid);
  if (!Number.isFinite(id)) return null;

  const result = await callDirectApi<{ AdGroups?: Array<{ Id: number; Name: string }> }>(
    companyId,
    'adgroups',
    { method: 'get', params: { SelectionCriteria: { Ids: [id] }, FieldNames: ['Id', 'Name'] } },
  );

  return result.AdGroups?.[0]?.Name ?? null;
}
