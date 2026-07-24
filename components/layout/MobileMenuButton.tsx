'use client';

import { type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import IconButton from '@/components/ui/IconButton';
import { useSidebarCollapse } from '@/components/providers/SidebarCollapseProvider';

/**
 * Бургер открытия сайдбара на мобильных (< lg).
 *
 * Живёт внутри шапки страницы (а не в потоке flex-строки, как раньше в Sidebar),
 * поэтому не сдвигает контент — сайдбар выезжает поверх как overlay-drawer.
 * Состояние открытия — в общем SidebarCollapseProvider, чтобы кнопка и сам drawer
 * (в Sidebar) были связаны, оставаясь в разных ветках дерева.
 */
export default function MobileMenuButton(): ReactNode {
  const { openMobile } = useSidebarCollapse();

  return (
    <IconButton
      size="sm"
      className="-ml-1 lg:hidden"
      onClick={openMobile}
      aria-label="Открыть меню"
      icon={<Icon icon="lucide:menu" className="h-5 w-5" />}
    />
  );
}
