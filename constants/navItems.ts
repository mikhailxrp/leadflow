import type { UserRole } from '@prisma/client';
import { hasMinRole } from '@/constants/roles';

export interface SidebarNavItem {
  label: string;
  icon: string;
  href: string;
  minRole: UserRole;
}

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { label: 'Сегодня', icon: 'lucide:layout-dashboard', href: '/today', minRole: 'MANAGER' },
  { label: 'Лиды', icon: 'lucide:users', href: '/leads', minRole: 'MANAGER' },
  { label: 'Воронка', icon: 'lucide:kanban', href: '/pipeline', minRole: 'MANAGER' },
  { label: 'Контроль', icon: 'lucide:activity', href: '/control', minRole: 'HEAD' },
  { label: 'Отчёты', icon: 'lucide:bar-chart-2', href: '/reports', minRole: 'HEAD' },
  { label: 'Интеграции', icon: 'lucide:plug', href: '/admin/integrations', minRole: 'ADMIN' },
  { label: 'Пользователи', icon: 'lucide:user-cog', href: '/admin/users', minRole: 'ADMIN' },
  { label: 'Настройки', icon: 'lucide:settings', href: '/admin/settings', minRole: 'ADMIN' },
];

export function getNavItemsForRole(role: UserRole): SidebarNavItem[] {
  return SIDEBAR_NAV_ITEMS.filter((item) => hasMinRole(role, item.minRole));
}
