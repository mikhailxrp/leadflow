import { auth } from '@/lib/auth';
import type { PlatformSession } from '@/types/session';

export async function requirePlatformSession(): Promise<PlatformSession> {
  const session = await auth();

  if (!session || session.kind !== 'platform' || !session.admin) {
    throw new Response('Unauthorized', { status: 401 });
  }

  return {
    kind: 'platform',
    admin: session.admin,
  };
}
