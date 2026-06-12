import { type ReactNode } from 'react';

interface AppGroupLayoutProps {
  children: ReactNode;
}

export default function AppGroupLayout({ children }: AppGroupLayoutProps) {
  return children;
}
