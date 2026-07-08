import { getCompanyLogs } from '@/lib/platform/logs';
import { requirePlatformSession } from '@/lib/platform/auth';
import { platformLogsQuerySchema } from '@/lib/validations/platform';

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function GET(request: Request): Promise<Response> {
  let session;
  try {
    session = await requirePlatformSession({
      roles: ['SUPER_ADMIN', 'MARKETER'],
    });
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const parsed = platformLogsQuerySchema.safeParse({
    companyId: searchParams.get('companyId') ?? undefined,
    type: searchParams.get('type') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
    leadId: searchParams.get('leadId') ?? undefined,
    page: searchParams.get('page') ?? undefined,
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

  const { companyId, type, from, to, leadId, page } = parsed.data;

  if (leadId && session.admin.role !== 'MARKETER') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const logs = await getCompanyLogs({
      admin: session.admin,
      companyId,
      type,
      from,
      to,
      leadId,
      page,
    });
    return Response.json(logs);
  } catch (error) {
    if (error instanceof Response) {
      return error;
    }
    console.error('Failed to fetch platform logs:', error);
    return Response.json(
      { error: 'Failed to fetch platform logs' },
      { status: 500 },
    );
  }
}
