const IMPERSONATION_TOKEN_TTL_MS = 60_000;

export type ImpersonationData = {
  userId: string;
  companyId: string;
  platformAdminId: string;
  expiresAt: number;
};

type RestoreData = {
  platformAdminId: string;
  expiresAt: number;
};

// Одноразовые токены входа держим на globalThis, а не в module-scope const:
// в Next.js dev роут-хендлеры собираются в отдельные бандлы (плюс HMR пересоздаёт
// модули), поэтому Map, заполненная при выдаче токена в /api/platform/..., может
// оказаться пустой в момент его проверки в authorize() NextAuth-колбэка — вход
// тогда падает на дефолтную страницу NextAuth. globalThis один на процесс — тот же
// приём, что и для prisma-клиента (lib/prisma.ts).
const globalForImpersonation = globalThis as unknown as {
  impersonationTokens?: Map<string, ImpersonationData>;
  restoreTokens?: Map<string, RestoreData>;
};

const tokens =
  globalForImpersonation.impersonationTokens ??
  (globalForImpersonation.impersonationTokens = new Map<
    string,
    ImpersonationData
  >());

export function createImpersonationToken(
  data: Omit<ImpersonationData, 'expiresAt'>,
): string {
  const token = crypto.randomUUID();
  tokens.set(token, {
    ...data,
    expiresAt: Date.now() + IMPERSONATION_TOKEN_TTL_MS,
  });
  return token;
}

export function consumeImpersonationToken(
  token: string,
): Omit<ImpersonationData, 'expiresAt'> | null {
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
    userId: data.userId,
    companyId: data.companyId,
    platformAdminId: data.platformAdminId,
  };
}

const restoreTokens =
  globalForImpersonation.restoreTokens ??
  (globalForImpersonation.restoreTokens = new Map<string, RestoreData>());

export function createRestoreToken(platformAdminId: string): string {
  const token = crypto.randomUUID();
  restoreTokens.set(token, {
    platformAdminId,
    expiresAt: Date.now() + IMPERSONATION_TOKEN_TTL_MS,
  });
  return token;
}

export function consumeRestoreToken(token: string): string | null {
  const data = restoreTokens.get(token);
  if (!data) {
    return null;
  }

  if (Date.now() > data.expiresAt) {
    restoreTokens.delete(token);
    return null;
  }

  restoreTokens.delete(token);
  return data.platformAdminId;
}
