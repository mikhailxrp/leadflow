import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { COMPANY_PROFILE_SELECT, toCompanyProfileDetail } from '@/lib/company/profile';
import { writeEvent } from '@/lib/events';
import { prisma } from '@/lib/prisma';
import { updateCompanyProfileSchema } from '@/lib/validations/company';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function GET(): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'HEAD' });
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  const company = await prisma.company.findUniqueOrThrow({
    where: { id: actor.companyId },
    select: COMPANY_PROFILE_SELECT,
  });

  return Response.json(toCompanyProfileDetail(company));
}

export async function PATCH(request: Request): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'HEAD' });
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

  const parsed = updateCompanyProfileSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { phone, email, address, legalForm, directorName } = parsed.data;

  try {
    const updated = await prisma.company.update({
      where: { id: actor.companyId },
      data: {
        phone,
        email,
        ...(address !== undefined ? { address: address?.trim() || null } : {}),
        ...(legalForm !== undefined ? { legalForm } : {}),
        ...(directorName !== undefined
          ? { directorName: directorName?.trim() || null }
          : {}),
      },
      select: COMPANY_PROFILE_SELECT,
    });

    await writeEvent(actor.companyId, 'COMPANY_PROFILE_UPDATED', {
      payload: { fields: Object.keys(parsed.data) },
    });

    return Response.json(toCompanyProfileDetail(updated));
  } catch (error) {
    console.error('Failed to update company profile:', error);
    return Response.json(
      { error: 'Failed to update company profile' },
      { status: 500 },
    );
  }
}
