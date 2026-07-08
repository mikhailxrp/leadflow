import { writeEvent } from '@/lib/events';
import { requirePlatformSession } from '@/lib/platform/auth';
import {
  isPlatformCompany,
  resolveOwnerRoles,
} from '@/lib/platform/companyVisibility';
import { prisma } from '@/lib/prisma';
import { createGrantSchema } from '@/lib/validations/platform';
import type { CompanyGrantItem } from '@/types/platform';
import { Prisma } from '@prisma/client';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

async function loadGrantItems(companyId: string): Promise<CompanyGrantItem[]> {
  const grants = await prisma.companyAccessGrant.findMany({
    where: { companyId },
    orderBy: { createdAt: 'desc' },
    select: { platformAdminId: true },
  });

  if (grants.length === 0) {
    return [];
  }

  const marketers = await prisma.platformAdmin.findMany({
    where: { id: { in: grants.map((grant) => grant.platformAdminId) } },
    select: { id: true, name: true, email: true },
  });
  const marketerById = new Map(marketers.map((marketer) => [marketer.id, marketer]));

  return grants
    .map((grant) => marketerById.get(grant.platformAdminId))
    .filter((marketer): marketer is (typeof marketers)[number] => marketer !== undefined)
    .map((marketer) => ({
      marketerId: marketer.id,
      name: marketer.name,
      email: marketer.email,
    }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    await requirePlatformSession({ roles: ['SUPER_ADMIN'] });
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  const { id: companyId } = await params;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, createdByPlatformAdminId: true },
  });

  if (!company) {
    return Response.json({ error: 'Company not found' }, { status: 404 });
  }

  const ownerRoles = await resolveOwnerRoles([company.createdByPlatformAdminId]);
  const ownerRole = company.createdByPlatformAdminId
    ? ownerRoles.get(company.createdByPlatformAdminId)
    : undefined;

  if (!isPlatformCompany(company, ownerRole)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const grants = await loadGrantItems(companyId);
    return Response.json(grants);
  } catch (error) {
    console.error('Failed to fetch company grants:', error);
    return Response.json({ error: 'Failed to fetch grants' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  let session;
  try {
    session = await requirePlatformSession({ roles: ['SUPER_ADMIN'] });
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  const { id: companyId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = createGrantSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { marketerId } = parsed.data;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, createdByPlatformAdminId: true },
  });

  if (!company) {
    return Response.json({ error: 'Company not found' }, { status: 404 });
  }

  const ownerRoles = await resolveOwnerRoles([company.createdByPlatformAdminId]);
  const ownerRole = company.createdByPlatformAdminId
    ? ownerRoles.get(company.createdByPlatformAdminId)
    : undefined;

  if (!isPlatformCompany(company, ownerRole)) {
    return Response.json(
      { error: 'Грант можно выдать только на платформенную компанию' },
      { status: 403 },
    );
  }

  const marketer = await prisma.platformAdmin.findUnique({
    where: { id: marketerId },
    select: { id: true, name: true, email: true, role: true, isActive: true, deletedAt: true },
  });

  if (
    !marketer ||
    marketer.role !== 'MARKETER' ||
    !marketer.isActive ||
    marketer.deletedAt
  ) {
    return Response.json(
      { error: 'Маркетолог не найден или неактивен' },
      { status: 400 },
    );
  }

  try {
    await prisma.companyAccessGrant.create({
      data: {
        companyId,
        platformAdminId: marketerId,
        grantedById: session.admin.id,
      },
    });

    await writeEvent(companyId, 'COMPANY_ACCESS_GRANTED', {
      payload: { marketerId, byPlatformAdminId: session.admin.id },
    });

    const item: CompanyGrantItem = {
      marketerId: marketer.id,
      name: marketer.name,
      email: marketer.email,
    };

    return Response.json(item, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return Response.json(
        { error: 'Грант уже выдан этому маркетологу' },
        { status: 409 },
      );
    }

    console.error('Failed to create company grant:', error);
    return Response.json({ error: 'Failed to create grant' }, { status: 500 });
  }
}
