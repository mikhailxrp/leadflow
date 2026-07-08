import { searchCompanyLeads } from '@/lib/platform/logs';
import { requirePlatformSession } from '@/lib/platform/auth';
import { platformLogsLeadSearchSchema } from '@/lib/validations/platform';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function GET(request: Request): Promise<Response> {
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

  const { searchParams } = new URL(request.url);
  const parsed = platformLogsLeadSearchSchema.safeParse({
    companyId: searchParams.get('companyId') ?? undefined,
    q: searchParams.get('q') ?? undefined,
  });

  if (!parsed.success) {
    return Response.json(
      {
        error: 'Validation failed',
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const leads = await searchCompanyLeads({
      admin: session.admin,
      companyId: parsed.data.companyId,
      q: parsed.data.q,
    });
    return Response.json(leads);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Failed to search company leads:', error);
    return Response.json(
      { error: 'Failed to search company leads' },
      { status: 500 },
    );
  }
}
