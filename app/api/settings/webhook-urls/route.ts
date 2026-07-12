import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { getWebhookUrls } from '@/lib/integrations/getWebhookUrls';

export async function GET(): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'ADMIN' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const urls = getWebhookUrls(actor.companyId);
  if (!urls) {
    return Response.json({ error: 'Server configuration error' }, { status: 500 });
  }

  return Response.json(urls);
}
