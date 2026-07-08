import { createCompany } from '@/lib/platform/createCompany';
import { requirePlatformSession } from '@/lib/platform/auth';
import {
  canManageCompany,
  isPlatformCompany,
  resolveOwnerRoles,
  visibilityWhere,
} from '@/lib/platform/companyVisibility';
import { getSubscriptionStatus } from '@/lib/platform/subscription';
import { prisma } from '@/lib/prisma';
import { createCompanySchema } from '@/lib/validations/platform';
import type { PlatformCompanyListItem } from '@/types/platform';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function GET(): Promise<Response> {
  let session;
  try {
    session = await requirePlatformSession({ roles: ['SUPER_ADMIN', 'MARKETER'] });
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  try {
    const [companies, lastLogins] = await Promise.all([
      prisma.company.findMany({
        where: visibilityWhere(session.admin),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          isBlocked: true,
          nextPaymentAt: true,
          createdAt: true,
          createdByPlatformAdminId: true,
          _count: { select: { users: true } },
        },
      }),
      prisma.user.groupBy({
        by: ['companyId'],
        _max: { lastLoginAt: true },
      }),
    ]);

    const lastLoginByCompanyId = new Map(
      lastLogins.map((row) => [row.companyId, row._max.lastLoginAt]),
    );

    const ownerRoles = await resolveOwnerRoles(
      companies.map((company) => company.createdByPlatformAdminId),
    );

    const result: PlatformCompanyListItem[] = companies.map((company) => {
      const ownerRole = company.createdByPlatformAdminId
        ? ownerRoles.get(company.createdByPlatformAdminId)
        : undefined;
      const lastLoginAt =
        lastLoginByCompanyId.get(company.id)?.toISOString() ?? null;

      if (
        session.admin.role === 'SUPER_ADMIN' &&
        !isPlatformCompany(company, ownerRole)
      ) {
        return {
          name: company.name,
          isBlocked: company.isBlocked,
          createdAt: company.createdAt.toISOString(),
          userCount: company._count.users,
          lastLoginAt,
          ownedByMarketer: true,
          manageable: false,
        };
      }

      const subscriptionStatus = getSubscriptionStatus(company.nextPaymentAt);

      return {
        id: company.id,
        name: company.name,
        isBlocked: company.isBlocked,
        createdAt: company.createdAt.toISOString(),
        userCount: company._count.users,
        lastLoginAt,
        nextPaymentAt: company.nextPaymentAt?.toISOString() ?? null,
        subscriptionStatus: subscriptionStatus.status,
        manageable: canManageCompany(session.admin, company, ownerRole),
      };
    });

    return Response.json(result);
  } catch (error) {
    console.error('Failed to fetch companies:', error);
    return Response.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  let session;
  try {
    session = await requirePlatformSession({ roles: ['SUPER_ADMIN', 'MARKETER'] });
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createCompanySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    console.error('APP_URL is not configured');
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const { company, inviteToken } = await createCompany({
      ...parsed.data,
      createdByPlatformAdminId: session.admin.id,
    });
    const baseUrl = appUrl.replace(/\/$/, '');
    const inviteUrl = `${baseUrl}/accept-invite?token=${inviteToken}`;

    return Response.json({
      companyId: company.id,
      inviteUrl,
    });
  } catch (error) {
    console.error('Failed to create company:', error);
    return Response.json({ error: 'Failed to create company' }, { status: 500 });
  }
}
