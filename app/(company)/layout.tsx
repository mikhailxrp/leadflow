import { type ReactNode } from 'react';
import AppShell from '@/components/layout/AppShell';

interface CompanyGroupLayoutProps {
  children: ReactNode;
}

export default function CompanyGroupLayout({ children }: CompanyGroupLayoutProps): ReactNode {
  return <AppShell>{children}</AppShell>;
}
