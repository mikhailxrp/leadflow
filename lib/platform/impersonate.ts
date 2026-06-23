const IMPERSONATION_TOKEN_TTL_MS = 60_000;

export type ImpersonationData = {
  userId: string;
  companyId: string;
  platformAdminId: string;
  expiresAt: number;
};

const tokens = new Map<string, ImpersonationData>();

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
