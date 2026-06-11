import { type ReactNode } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import Sidebar from '@/components/layout/Sidebar';

const NAV_ITEMS = [
  { label: 'Дашборд', icon: 'lucide:layout-dashboard', href: '/dashboard' },
  { label: 'Лиды', icon: 'lucide:users', href: '/leads' },
  { label: 'Воронка', icon: 'lucide:kanban', href: '/pipeline' },
  { label: 'Интеграции', icon: 'lucide:plug', href: '/admin/integrations' },
  { label: 'Пользователи', icon: 'lucide:user-cog', href: '/admin/users' },
  { label: 'Настройки', icon: 'lucide:settings', href: '/admin/settings' },
];

interface AdminGroupLayoutProps {
  children: ReactNode;
}

export default function AdminGroupLayout({ children }: AdminGroupLayoutProps) {
  return (
    <AppLayout sidebar={<Sidebar items={NAV_ITEMS} />}>
      {children}
    </AppLayout>
  );
}
