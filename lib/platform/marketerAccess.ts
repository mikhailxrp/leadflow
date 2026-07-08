const MARKETER_ACCESS_TOKEN_TTL_MS = 60_000;

export type MarketerAccessData = {
  platformAdminId: string;
  companyId: string;
  expiresAt: number;
};

const tokens = new Map<string, MarketerAccessData>();

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
