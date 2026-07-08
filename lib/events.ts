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

  const impersonatedByPlatformAdminId =
    session?.kind === 'company' &&
    session.user?.impersonatedByPlatformAdminId
      ? session.user.impersonatedByPlatformAdminId
      : null;

  const { payload = {}, userId = null, leadId = null } = opts;

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
