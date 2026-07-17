import 'server-only';

import { prisma } from '@/lib/prisma';
import { refreshAccessToken, saveMetrikaTokens } from '@/lib/integrations/yandex/metrikaOauth';

const METRIKA_API_BASE_URL = 'https://api-metrika.yandex.net/management/v1';

export type MetrikaClientIdType = 'CLIENT_ID' | 'YCLID';

export type OfflineConversionRow = {
  identifier: string;
  target: string;
  dateTimeSeconds: number;
};

type StoredMetrikaTokens = {
  accessToken: string;
  refreshToken: string;
  login: string | null;
};

async function getStoredTokens(companyId: string): Promise<StoredMetrikaTokens | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { metrikaAccessToken: true, metrikaRefreshToken: true, metrikaLogin: true },
  });

  if (!company?.metrikaAccessToken || !company.metrikaRefreshToken) return null;

  return {
    accessToken: company.metrikaAccessToken,
    refreshToken: company.metrikaRefreshToken,
    login: company.metrikaLogin,
  };
}

function escapeCsvValue(value: string | number): string {
  const str = String(value);
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function buildConversionsCsv(clientIdType: MetrikaClientIdType, rows: OfflineConversionRow[]): string {
  const idHeader = clientIdType === 'YCLID' ? 'Yclid' : 'ClientId';
  const lines: (string | number)[][] = [
    [idHeader, 'Target', 'DateTime'],
    ...rows.map((row) => [row.identifier, row.target, row.dateTimeSeconds]),
  ];
  return lines.map((line) => line.map(escapeCsvValue).join(',')).join('\r\n');
}

async function postUpload(
  counterId: string,
  clientIdType: MetrikaClientIdType,
  accessToken: string,
  csv: string,
): Promise<{ ok: boolean; status: number }> {
  const url = `${METRIKA_API_BASE_URL}/counter/${counterId}/offline_conversions/upload?client_id_type=${clientIdType}`;

  const form = new FormData();
  form.append('file', new Blob([csv], { type: 'text/csv' }), 'conversions.csv');

  const response = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `OAuth ${accessToken}` },
    body: form,
  });

  return { ok: response.ok, status: response.status };
}

/**
 * Загружает офлайн-конверсии одной группы (один client_id_type = один запрос,
 * смешивать ClientId/Yclid в одной загрузке нельзя). Один авто-refresh на HTTP 401
 * (не на код ошибки в теле — формат ошибок Metrika API, в отличие от Direct API v5,
 * не задокументирован). Заголовок — `OAuth <token>`, не `Bearer` (другой формат,
 * чем у Direct API v5, см. `directApi.ts`). Не бросает исключение — любой сбой
 * (нет токена, неудачный refresh, не-2xx, сетевая ошибка) даёт `false`, токен
 * не логируется.
 */
export async function uploadOfflineConversions(
  companyId: string,
  counterId: string,
  clientIdType: MetrikaClientIdType,
  rows: OfflineConversionRow[],
): Promise<boolean> {
  if (rows.length === 0) return true;

  try {
    const tokens = await getStoredTokens(companyId);
    if (!tokens) return false;

    const csv = buildConversionsCsv(clientIdType, rows);

    let attempt = await postUpload(counterId, clientIdType, tokens.accessToken, csv);

    if (attempt.status === 401) {
      const refreshed = await refreshAccessToken(tokens.refreshToken);
      await saveMetrikaTokens(companyId, refreshed, tokens.login);
      attempt = await postUpload(counterId, clientIdType, refreshed.accessToken, csv);
    }

    return attempt.ok;
  } catch (error) {
    console.error('[metrikaApi] offline conversions upload failed:', error);
    return false;
  }
}
