'use client';

import { type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import AppLayout from '@/components/layout/AppLayout';
import Sidebar from '@/components/layout/Sidebar';
import { SIDEBAR_NAV_ITEMS } from '@/constants/navItems';

function isPublicRoute(pathname: string): boolean {
  return (
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/accept-invite') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/platform/login')
  );
}

function isPlatformRoute(pathname: string): boolean {
  return pathname.startsWith('/platform') && !pathname.startsWith('/platform/login');
}

interface ShellGateProps {
  children: ReactNode;
}

export default function ShellGate({ children }: ShellGateProps) {
  const pathname = usePathname();

  if (isPublicRoute(pathname) || isPlatformRoute(pathname)) {
    return children;
  }

  return (
    <AppLayout sidebar={<Sidebar items={SIDEBAR_NAV_ITEMS} />}>
      {children}
    </AppLayout>
  );
}
