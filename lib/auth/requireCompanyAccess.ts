import type { UserRole } from '@prisma/client';
import { isMarketerAllowedApi } from '@/constants/marketerAccess';
import { hasMinRole } from '@/constants/roles';
import { auth } from '@/lib/auth';
import type { CompanySession } from '@/types/session';

export type CompanyActor =
  | {
      actor: 'user';
      userId: string;
      companyId: string;
      role: UserRole;
      impersonatedByPlatformAdminId?: string;
    }
  | {
      actor: 'marketer';
      platformAdminId: string;
      companyId: string;
    };

type UserActor = Extract<CompanyActor, { actor: 'user' }>;
type MarketerActor = Extract<CompanyActor, { actor: 'marketer' }>;

function buildUserActor(user: NonNullable<CompanySession['user']>): UserActor {
  return {
    actor: 'user',
    userId: user.id,
    companyId: user.companyId,
    role: user.role,
    impersonatedByPlatformAdminId: user.impersonatedByPlatformAdminId,
  };
}

function buildMarketerActor(marketer: NonNullable<CompanySession['marketer']>): MarketerActor {
  return {
    actor: 'marketer',
    platformAdminId: marketer.platformAdminId,
    companyId: marketer.companyId,
  };
}

/** Для Server Components (страницы), которые уже получили `session` через `auth()`. */
export function toCompanyActor(session: CompanySession): CompanyActor {
  if (session.marketer) {
    return buildMarketerActor(session.marketer);
  }

  if (!session.user) {
    throw new Error('Invalid CompanySession: neither user nor marketer present');
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
 * Роуты, недоступные маркетологу ни при каких условиях (мутации лидов, admin-зона).
 * Маркетолог отсекается deny-by-default: 403, если сессия — actor `marketer`.
 */
export async function requireCompanyUser({
  minRole,
}: {
  minRole: UserRole;
}): Promise<UserActor> {
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
 * Единый guard для эндпоинтов, доступных обеим сторонам company-сессии:
 * для `user` — делегирует в `hasMinRole`, для `marketer` — сверяет allow-list по пути и методу.
 */
export async function requireCompanyAccess({
  minRole,
  method,
  pathname,
}: {
  minRole: UserRole;
  method: string;
  pathname: string;
}): Promise<CompanyActor> {
  const session = await auth();

  if (!session || session.kind !== 'company') {
    throw unauthorized();
  }

  if (session.marketer) {
    if (!isMarketerAllowedApi(pathname, method)) {
      throw forbidden();
    }
    return buildMarketerActor(session.marketer);
  }

  if (!session.user) {
    throw unauthorized();
  }

  if (!hasMinRole(session.user.role, minRole)) {
    throw forbidden();
  }

  return buildUserActor(session.user);
}
