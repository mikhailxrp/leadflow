import type { Prisma } from '@prisma/client';

function readRoundRobinCursor(settings: Prisma.JsonValue): string | null {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return null;
  }
  const value = (settings as Record<string, unknown>).roundRobinCursor;
  return typeof value === 'string' ? value : null;
}

/**
 * Picks the next active MANAGER after the stored cursor, in a circle.
 *
 * Exact role match (role: "MANAGER"), not hasMinRole — HEAD/ADMIN are
 * deliberately excluded from auto-assignment by phase decision (they get
 * leads only via AssignmentRule or manual assignment).
 *
 * Must run inside the same transaction as the advisory lock: the lock only
 * holds for the lifetime of that transaction, so reading the cursor,
 * picking a manager and writing the new cursor here — all in `tx` — is what
 * prevents two concurrent intakes from picking the same manager.
 */
export async function pickNextManager(
  tx: Prisma.TransactionClient,
  companyId: string,
): Promise<string | null> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}))`;

  const managers = await tx.user.findMany({
    where: { companyId, role: 'MANAGER' },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    select: { id: true, isBlocked: true },
  });

  const activeManagers = managers.filter((manager) => !manager.isBlocked);
  if (activeManagers.length === 0) {
    return null;
  }

  const company = await tx.company.findUniqueOrThrow({
    where: { id: companyId },
    select: { settings: true },
  });
  const cursor = readRoundRobinCursor(company.settings);
  const cursorIndex = cursor ? managers.findIndex((manager) => manager.id === cursor) : -1;

  // Cursor missing, or pointing at a manager since removed/blocked — the loop
  // below still finds the next active manager after that circle position;
  // cursorIndex === -1 (never set) falls back to the first active manager.
  let next = activeManagers[0];
  if (cursorIndex !== -1) {
    for (let offset = 1; offset <= managers.length; offset += 1) {
      const candidate = managers[(cursorIndex + offset) % managers.length];
      if (candidate && !candidate.isBlocked) {
        next = candidate;
        break;
      }
    }
  }

  const rawSettings =
    company.settings && typeof company.settings === 'object' && !Array.isArray(company.settings)
      ? (company.settings as Record<string, unknown>)
      : {};

  await tx.company.update({
    where: { id: companyId },
    data: { settings: { ...rawSettings, roundRobinCursor: next.id } as Prisma.InputJsonValue },
  });

  return next.id;
}
