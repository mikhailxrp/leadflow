import { requirePlatformSession } from '@/lib/platform/auth';
import { prisma } from '@/lib/prisma';
import { updateMarketerProfileSchema } from '@/lib/validations/platform';
import type { MarketerDetail } from '@/types/platform';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function PATCH(request: Request): Promise<Response> {
  let session;
  try {
    session = await requirePlatformSession({ roles: ['MARKETER'] });
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

  const parsedBody = updateMarketerProfileSchema.safeParse(body);
  if (!parsedBody.success) {
    return Response.json(
      { error: 'Validation failed', details: parsedBody.error.flatten() },
      { status: 400 },
    );
  }

  const { name, phone, telegram, vk, max } = parsedBody.data;
  const id = session.admin.id;

  try {
    const updated = await prisma.platformAdmin.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(phone !== undefined ? { phone: phone.trim() } : {}),
        ...(telegram !== undefined
          ? { telegram: telegram?.trim() || null }
          : {}),
        ...(vk !== undefined ? { vk: vk?.trim() || null } : {}),
        ...(max !== undefined ? { max: max?.trim() || null } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        telegram: true,
        vk: true,
        max: true,
        isActive: true,
        passwordHash: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    const [ownedCompanies, grants] = await Promise.all([
      prisma.company.findMany({
        where: { createdByPlatformAdminId: id },
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, createdAt: true, isBlocked: true },
      }),
      prisma.companyAccessGrant.findMany({
        where: { platformAdminId: id },
        orderBy: { createdAt: 'desc' },
        select: {
          company: {
            select: { id: true, name: true, createdAt: true, isBlocked: true },
          },
        },
      }),
    ]);

    const detail: MarketerDetail = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      avatarUrl: updated.avatarUrl,
      telegram: updated.telegram,
      vk: updated.vk,
      max: updated.max,
      isActive: updated.isActive,
      invitePending: updated.passwordHash === null,
      lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
      createdAt: updated.createdAt.toISOString(),
      companies: ownedCompanies.map((company) => ({
        id: company.id,
        name: company.name,
        createdAt: company.createdAt.toISOString(),
        isBlocked: company.isBlocked,
      })),
      grantedCompanies: grants.map((grant) => ({
        id: grant.company.id,
        name: grant.company.name,
        createdAt: grant.company.createdAt.toISOString(),
        isBlocked: grant.company.isBlocked,
      })),
    };

    return Response.json(detail);
  } catch (error) {
    console.error('Failed to update own profile:', error);
    return Response.json(
      { error: 'Failed to update profile' },
      { status: 500 },
    );
  }
}
