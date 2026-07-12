import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';

export async function GET(): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'ADMIN' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    console.error('APP_URL is not configured');
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const baseUrl = appUrl.replace(/\/$/, '');

  return Response.json({
    tildaUrl: `${baseUrl}/api/webhooks/tilda/${actor.companyId}`,
    wordpressUrl: `${baseUrl}/api/webhooks/wordpress/${actor.companyId}`,
  });
}
