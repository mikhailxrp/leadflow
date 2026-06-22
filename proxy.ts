import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { hasMinRole } from '@/constants/roles';
import type { AppSession } from '@/types/session';

export const proxy = auth((req) => {
  const session = req.auth as AppSession | null;
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/accept-invite') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/platform/login')
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/platform')) {
    if (!session || session.kind !== 'platform') {
      return NextResponse.redirect(new URL('/platform/login', req.url));
    }
    return NextResponse.next();
  }

  if (!session || session.kind !== 'company') {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (pathname.startsWith('/control') || pathname.startsWith('/reports')) {
    if (!hasMinRole(session.user.role, 'HEAD')) {
      return NextResponse.redirect(new URL('/today', req.url));
    }
  }

  if (pathname.startsWith('/admin')) {
    if (!hasMinRole(session.user.role, 'ADMIN')) {
      return NextResponse.redirect(new URL('/today', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/today/:path*',
    '/leads/:path*',
    '/pipeline/:path*',
    '/control/:path*',
    '/reports/:path*',
    '/admin/:path*',
    '/platform/:path*',
  ],
};
