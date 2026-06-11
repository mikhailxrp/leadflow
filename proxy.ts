import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// TODO: обернуть в auth() после настройки NextAuth v5 в lib/auth.ts
export function proxy(_request: NextRequest): NextResponse {
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/leads/:path*',
    '/pipeline/:path*',
    '/admin/:path*',
  ],
};
