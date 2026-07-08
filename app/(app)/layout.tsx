import { type ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';

interface AppGroupLayoutProps {
  children: ReactNode;
}

export default function AppGroupLayout({ children }: AppGroupLayoutProps): ReactNode {
  return <AppShell>{children}</AppShell>;
}
