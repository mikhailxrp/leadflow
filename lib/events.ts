import type { EventType, Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export type WriteEventOptions = {
  payload?: Prisma.InputJsonValue;
  userId?: string | null;
  leadId?: string | null;
};

export async function writeEvent(
  companyId: string,
  type: EventType,
  opts: WriteEventOptions = {},
): Promise<void> {
  const session = await auth();

  let userId = opts.userId ?? null;
  let impersonatedByPlatformAdminId: string | null = null;

  if (session?.kind === 'company') {
    if (session.marketer) {
      userId = null;
      impersonatedByPlatformAdminId = session.marketer.platformAdminId;
    } else if (session.user?.impersonatedByPlatformAdminId) {
      impersonatedByPlatformAdminId = session.user.impersonatedByPlatformAdminId;
    }
  }

  const { payload = {}, leadId = null } = opts;

  await prisma.event.create({
    data: {
      companyId,
      type,
      payload,
      userId,
      leadId,
      impersonatedByPlatformAdminId,
    },
  });
}
