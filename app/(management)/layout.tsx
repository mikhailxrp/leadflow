import { type ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';

interface ManagementGroupLayoutProps {
  children: ReactNode;
}

export default function ManagementGroupLayout({ children }: ManagementGroupLayoutProps): ReactNode {
  return <AppShell>{children}</AppShell>;
}
