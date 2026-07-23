import type { UserRole } from '@prisma/client';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import type { CompanySession } from '@/types/session';

export type CompanyActor = {
  actor: 'user';
  userId: string;
  companyId: string;
  role: UserRole;
  impersonatedByPlatformAdminId?: string;
};

function buildUserActor(user: NonNullable<CompanySession['user']>): CompanyActor {
  return {
    actor: 'user',
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
    impersonatedByPlatformAdminId: user.impersonatedByPlatformAdminId,
  };
}

/** Для Server Components (страницы), которые уже получили `session` через `auth()`. */
export function toCompanyActor(session: CompanySession): CompanyActor {
  if (!session.user) {
    throw new Error('Invalid CompanySession: user missing');
  }

  return buildUserActor(session.user);
}

function unauthorized(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

function forbidden(): Response {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * Гард company-эндпоинта: требует сессию пользователя компании с ролью не ниже `minRole`.
 *
 * Маркетолог внутри компании больше не является отдельным виртуальным actor'ом — он
 * входит через impersonation реального ADMIN (см. lib/platform/impersonate.ts и
 * app/api/platform/companies/[id]/marketer-access), поэтому для авторизации он
 * неотличим от обычного администратора компании и проходит `hasMinRole` штатно.
 */
export async function requireCompanyUser({
  minRole,
}: {
  minRole: UserRole;
}): Promise<CompanyActor> {
  const session = await auth();

  if (!session || session.kind !== 'company') {
    throw unauthorized();
  }

  if (!session.user) {
    throw forbidden();
  }

  if (!hasMinRole(session.user.role, minRole)) {
    throw forbidden();
  }

  return buildUserActor(session.user);
}

/**
 * Совместимый со старыми вызовами гард. `method`/`pathname` больше не используются
 * (раньше по ним сверялся allow-list маркетолога) и оставлены опциональными, чтобы не
 * трогать десятки существующих call site'ов. Семантика — та же, что у `requireCompanyUser`.
 */
export async function requireCompanyAccess({
  minRole,
}: {
  minRole: UserRole;
  method?: string;
  pathname?: string;
}): Promise<CompanyActor> {
  return requireCompanyUser({ minRole });
}
