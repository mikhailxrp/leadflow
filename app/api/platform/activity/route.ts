import { getCompanyActivity } from '@/lib/platform/companyActivity';
import { requirePlatformSession } from '@/lib/platform/auth';
import { activityPeriodSchema } from '@/lib/validations/platform';

const MS_PER_DAY = 86_400_000;
const DEFAULT_PERIOD_DAYS = 30;

function unauthorizedResponse(error: unknown): Response | null {
  if (error instanceof Response) {
    return error;
  }
  return null;
}

export async function GET(request: Request): Promise<Response> {
  try {
    await requirePlatformSession();
  } catch (error) {
    const response = unauthorizedResponse(error);
    if (response) {
      return response;
    }
    throw error;
  }

  const { searchParams } = new URL(request.url);
  const rawPeriod = searchParams.get('period') ?? String(DEFAULT_PERIOD_DAYS);
  const parsedPeriod = activityPeriodSchema.safeParse(rawPeriod);

  if (!parsedPeriod.success) {
    return Response.json(
      {
        error: 'Validation failed',
        details: parsedPeriod.error.flatten(),
      },
      { status: 400 },
    );
  }

  const periodDays = parsedPeriod.data;
  const periodStart = new Date(Date.now() - periodDays * MS_PER_DAY);

  try {
    const activity = await getCompanyActivity(periodStart);
    return Response.json(activity);
  } catch (error) {
    console.error('Failed to fetch company activity:', error);
    return Response.json(
      { error: 'Failed to fetch company activity' },
      { status: 500 },
    );
  }
}
