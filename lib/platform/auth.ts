import type { PlatformRole } from '@prisma/client';
import { auth } from '@/lib/auth';
import type { PlatformSession } from '@/types/session';

export async function requirePlatformSession({
  roles,
}: {
  roles: PlatformRole[];
}): Promise<PlatformSession> {
  const session = await auth();

  if (!session || session.kind !== 'platform' || !session.admin) {
    throw new Response('Unauthorized', { status: 401 });
  }

  if (!roles.includes(session.admin.role)) {
    throw new Response('Forbidden', { status: 403 });
  }

  return {
    kind: 'platform',
    admin: session.admin,
  };
}
