import { checkRateLimit } from '@/lib/rateLimit';
import { parseBody } from '@/lib/intake/parseBody';
import { createLead } from '@/lib/intake/createLead';
import { flagPossibleDuplicates } from '@/lib/intake/flagPossibleDuplicates';
import { touchIntegrationSource } from '@/lib/intake/touchIntegrationSource';
import { webhookBodySchema } from '@/lib/validations/webhooks';
import { prisma } from '@/lib/prisma';

function getIp(request: Request): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    undefined
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ companyId: string }> },
): Promise<Response> {
  const ip = getIp(request);

  if (!checkRateLimit(ip, 60, 60_000)) {
    return Response.json({ error: 'RATE_LIMIT' }, { status: 429 });
  }

  const { companyId } = await params;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true },
  });

  if (!company) {
    return Response.json({ error: 'Company not found' }, { status: 404 });
  }

  // parseBody handles JSON and form-urlencoded automatically — no extra logic needed
  const body = webhookBodySchema.parse(await parseBody(request));

  try {
    const lead = await createLead(body, 'wordpress', companyId);
    await touchIntegrationSource(companyId, 'wordpress', '', false);
    void flagPossibleDuplicates(lead.id, companyId).catch(console.error);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('[wordpress webhook] createLead failed:', error);
    await touchIntegrationSource(companyId, 'wordpress', '', true);
    return Response.json({ error: 'INTERNAL_ERROR' }, { status: 500 });
  }
}
