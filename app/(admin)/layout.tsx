import { type ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';

interface AdminGroupLayoutProps {
  children: ReactNode;
}

export default function AdminGroupLayout({ children }: AdminGroupLayoutProps): ReactNode {
  return <AppShell>{children}</AppShell>;
}
