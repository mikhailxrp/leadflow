import { type ReactNode } from 'react';

interface ManagementGroupLayoutProps {
  children: ReactNode;
}

export default function ManagementGroupLayout({
  children,
}: ManagementGroupLayoutProps) {
  return children;
}
