const MARKETER_ACCESS_TOKEN_TTL_MS = 60_000;

export type MarketerAccessData = {
  platformAdminId: string;
  companyId: string;
  expiresAt: number;
};

// Хранилище одноразовых токенов держим на globalThis, а не в module-scope const:
// в Next.js dev роут-хендлеры собираются в отдельные бандлы и могут получить свой
// экземпляр модуля (как и при HMR), поэтому Map, заполненная при выдаче токена в
// /api/platform/.../marketer-access, оказывается пустой в момент его проверки в
// authorize() NextAuth-колбэка → вход маркетолога падает на дефолтную страницу
// NextAuth. globalThis один на процесс — тот же приём, что и для prisma-клиента
// (lib/prisma.ts).
const globalForMarketerAccess = globalThis as unknown as {
  marketerAccessTokens?: Map<string, MarketerAccessData>;
};

const tokens =
  globalForMarketerAccess.marketerAccessTokens ??
  (globalForMarketerAccess.marketerAccessTokens = new Map<
    string,
    MarketerAccessData
  >());

export function createMarketerAccessToken(
  data: Omit<MarketerAccessData, 'expiresAt'>,
): string {
  const token = crypto.randomUUID();
  tokens.set(token, {
    ...data,
    expiresAt: Date.now() + MARKETER_ACCESS_TOKEN_TTL_MS,
  });
  return token;
}

export function consumeMarketerAccessToken(
  token: string,
): Omit<MarketerAccessData, 'expiresAt'> | null {
  const data = tokens.get(token);
  if (!data) {
    return null;
  }

  if (Date.now() > data.expiresAt) {
    tokens.delete(token);
    return null;
  }

  tokens.delete(token);
  return {
    platformAdminId: data.platformAdminId,
    companyId: data.companyId,
  };
}
