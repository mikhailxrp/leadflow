import { NextResponse } from 'next/server';
import { requireCompanyUser } from '@/lib/auth/requireCompanyAccess';
import { buildAuthorizeUrl } from '@/lib/integrations/yandex/metrikaOauth';

export async function GET(): Promise<Response> {
  let actor;
  try {
    actor = await requireCompanyUser({ minRole: 'ADMIN' });
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  return NextResponse.redirect(buildAuthorizeUrl(actor.companyId));
}
