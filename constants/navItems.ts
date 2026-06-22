export interface SidebarNavItem {
  label: string;
  icon: string;
  href: string;
}

export const SIDEBAR_NAV_ITEMS: SidebarNavItem[] = [
  { label: 'Сегодня', icon: 'lucide:layout-dashboard', href: '/today' },
  { label: 'Лиды', icon: 'lucide:users', href: '/leads' },
  { label: 'Воронка', icon: 'lucide:kanban', href: '/pipeline' },
  { label: 'Интеграции', icon: 'lucide:plug', href: '/admin/integrations' },
  { label: 'Пользователи', icon: 'lucide:user-cog', href: '/admin/users' },
  { label: 'Настройки', icon: 'lucide:settings', href: '/admin/settings' },
];
