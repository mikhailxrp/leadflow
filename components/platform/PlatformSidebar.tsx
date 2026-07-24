'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';
import type { PlatformRole } from '@prisma/client';
import type { ReactNode } from 'react';
import PlatformSignOutButton from '@/components/platform/PlatformSignOutButton';
import ThemeToggle from '@/components/ui/ThemeToggle';

interface PlatformSidebarProps {
  role: PlatformRole;
  /** Открыт ли мобильный drawer (управляется из PlatformShell). */
  mobileOpen: boolean;
  /** Закрыть мобильный drawer (клик по ссылке или затемнению). */
  onClose: () => void;
}

const NAV_ITEMS = [
  {
    label: 'Компании',
    href: '/platform/companies',
    icon: 'tabler:building',
  },
  {
    label: 'Администраторы',
    href: '/platform/admins',
    icon: 'tabler:users',
    superAdminOnly: true,
  },
  {
    label: 'Маркетологи',
    href: '/platform/marketers',
    icon: 'tabler:speakerphone',
    superAdminOnly: true,
  },
  {
    label: 'Активность',
    href: '/platform/activity',
    icon: 'tabler:activity',
  },
  {
    label: 'Логи',
    href: '/platform/logs',
    icon: 'tabler:list-details',
  },
  {
    label: 'Профиль',
    href: '/platform/profile',
    icon: 'tabler:user-circle',
    marketerOnly: true,
  },
] as const;

function linkClassName(active: boolean): string {
  return `
    flex items-center gap-3 rounded-[6px] px-3 py-[7px]
    text-[13px] font-medium transition-colors duration-150
    ${
      active
        ? 'bg-white/5 text-[#10B981]'
        : 'text-[#94A3B8] hover:bg-[rgba(255,255,255,0.06)]'
    }
  `;
}

function SidebarContent({
  role,
  pathname,
  onNavigate,
}: {
  role: PlatformRole;
  pathname: string;
  onNavigate?: () => void;
}): ReactNode {
  const visibleNavItems = NAV_ITEMS.filter((item) => {
    if ('superAdminOnly' in item && role !== 'SUPER_ADMIN') {
      return false;
    }
    if ('marketerOnly' in item && role !== 'MARKETER') {
      return false;
    }
    return true;
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
        <span className="text-base font-medium tracking-wide text-white">
          Лид-Канал
        </span>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {visibleNavItems.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={linkClassName(active)}
            >
              <Icon
                icon={item.icon}
                className="h-4 w-4 flex-shrink-0"
                aria-hidden="true"
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-3">
        <div className="mb-1 flex justify-end px-1">
          <ThemeToggle className="text-[#94A3B8] hover:bg-white/[0.06] hover:text-white" />
        </div>
        <PlatformSignOutButton />
      </div>
    </div>
  );
}

export default function PlatformSidebar({
  role,
  mobileOpen,
  onClose,
}: PlatformSidebarProps): ReactNode {
  const pathname = usePathname();

  return (
    <>
      {/* Десктоп: постоянная колонка в потоке (≥ lg) */}
      <aside className="hidden h-screen w-[220px] flex-shrink-0 flex-col bg-[#1A1F2E] lg:flex">
        <SidebarContent role={role} pathname={pathname} />
      </aside>

      {/* Затемнение под мобильным drawer */}
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}

      {/* Мобильный drawer (< lg) */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[220px] flex-col bg-[#1A1F2E]
          transform transition-transform duration-300 lg:hidden
          ${mobileOpen ? 'flex translate-x-0' : 'hidden -translate-x-full'}
        `}
      >
        <SidebarContent role={role} pathname={pathname} onNavigate={onClose} />
      </aside>
    </>
  );
}
