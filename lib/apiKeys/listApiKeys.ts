import 'server-only';

import { maskApiKey } from '@/lib/apiKeys/generateApiKey';
import { prisma } from '@/lib/prisma';

export type ApiKeyListItem = {
  id: string;
  name: string;
  sourceLabel: string;
  mask: string;
  createdAt: Date;
};

/** `keyHash` никогда не покидает эту функцию — наружу только производная маска. */
export async function listApiKeys(companyId: string): Promise<ApiKeyListItem[]> {
  const keys = await prisma.apiKey.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, sourceLabel: true, keyHash: true, createdAt: true },
  });

  return keys.map(({ keyHash, ...key }) => ({ ...key, mask: maskApiKey(keyHash) }));
}
