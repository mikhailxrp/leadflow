import { checkRateLimit } from '@/lib/rateLimit';
import { verifyApiKey } from '@/lib/intake/verifyApiKey';
import { parseBody } from '@/lib/intake/parseBody';
import { createLead } from '@/lib/intake/createLead';
import { touchIntegrationSource } from '@/lib/intake/touchIntegrationSource';
import { webhookBodySchema } from '@/lib/validations/webhooks';

function getIp(request: Request): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    undefined
  );
}

function extractKey(request: Request): string | null {
  const headerKey = request.headers.get('x-api-key');
  if (headerKey) return headerKey;

  const url = new URL(request.url);
  return url.searchParams.get('key');
}

export async function POST(request: Request): Promise<Response> {
  // Rate limit by IP before any DB access
  const ip = getIp(request);
  if (!checkRateLimit(ip, 60, 60_000)) {
    return Response.json({ error: 'RATE_LIMIT' }, { status: 429 });
  }

  const plainKey = extractKey(request);
  if (!plainKey) {
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const verified = await verifyApiKey(plainKey);
  if (!verified) {
    // companyId unknown — touchIntegrationSource is NOT called
    return Response.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { companyId, sourceLabel, apiKeyId } = verified;

  // Rate limit by ApiKey.id after verification
  if (!checkRateLimit(apiKeyId, 60, 60_000)) {
    return Response.json({ error: 'RATE_LIMIT' }, { status: 429 });
  }

  const body = webhookBodySchema.parse(await parseBody(request));

  try {
    await createLead(body, sourceLabel, companyId);
    await touchIntegrationSource(companyId, 'api', sourceLabel, false);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('[universal webhook] createLead failed:', error);
    await touchIntegrationSource(companyId, 'api', sourceLabel, true);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
