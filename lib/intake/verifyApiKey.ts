import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';

export type VerifiedApiKey = {
  companyId: string;
  sourceLabel: string;
  apiKeyId: string;
};

/**
 * Verifies a plain-text API key against the stored SHA-256 hash.
 * Returns null on mismatch — plain key is never logged.
 * SHA-256 is used (not bcrypt) because bcrypt salts prevent findFirst by hash.
 */
export async function verifyApiKey(key: string): Promise<VerifiedApiKey | null> {
  const keyHash = createHash('sha256').update(key).digest('hex');

  const record = await prisma.apiKey.findFirst({
    where: { keyHash },
    select: { id: true, companyId: true, sourceLabel: true },
  });

  if (!record) return null;

  return {
    companyId: record.companyId,
    sourceLabel: record.sourceLabel,
    apiKeyId: record.id,
  };
}
