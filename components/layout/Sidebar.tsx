'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';
import IconButton from '@/components/ui/IconButton';

interface NavItem {
  label: string;
  icon: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}

interface SidebarProps {
  items: NavItem[];
  userInitials?: string;
  userName?: string;
}

interface SidebarContentProps {
  items: NavItem[];
  pathname: string;
  userInitials: string;
  userName: string;
  onNavigate?: () => void;
}

function SidebarContent({
  items,
  pathname,
  userInitials,
  userName,
  onNavigate,
}: SidebarContentProps): ReactNode {
  function isActive(item: NavItem): boolean {
    if (item.active !== undefined) return item.active;
    if (!item.href || item.href === '#') return false;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function isProfileActive(): boolean {
    return pathname === '/admin/profile' || pathname.startsWith('/admin/profile/');
  }

  const linkClassName = (active: boolean): string => `
    flex items-center gap-3 px-3 py-[7px] rounded-[6px]
    text-[13px] font-medium
    transition-colors duration-150
    ${active
      ? 'bg-[rgba(16,185,129,0.15)] text-[#34D399]'
      : 'text-[#94A3B8] hover:bg-[rgba(255,255,255,0.06)]'
    }
  `;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
        <span className="text-base font-medium tracking-wide text-white">LeadFlow</span>
      </div>

      <nav className="mt-2 flex-1 space-y-1 px-3">
        {items.map((item) => {
          const active = isActive(item);
          const className = linkClassName(active);

          if (!item.href || item.href === '#') {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className={className}
              >
                <Icon icon={item.icon} className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {item.label}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => {
                item.onClick?.();
                onNavigate?.();
              }}
              className={className}
            >
              <Icon icon={item.icon} className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-4">
        <Link
          href="/admin/profile"
          onClick={onNavigate}
          aria-label="Профиль пользователя"
          className={`
            flex items-center gap-3 rounded-[6px] px-2 py-3
            transition-colors duration-150
            ${isProfileActive()
              ? 'bg-[rgba(16,185,129,0.15)]'
              : 'hover:bg-[rgba(255,255,255,0.06)]'
            }
          `}
        >
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#252B3B] text-[12px] font-medium text-white">
            {userInitials}
          </div>
          <span className="truncate text-[13px] font-medium text-white">{userName}</span>
        </Link>
      </div>
    </div>
  );
}

export default function Sidebar({
  items,
  userInitials = 'АД',
  userName = 'Администратор',
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  function closeMobile(): void {
    setMobileOpen(false);
  }

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[220px] flex-shrink-0 flex-col bg-[#1A1F2E] lg:flex">
        <SidebarContent
          items={items}
          pathname={pathname}
          userInitials={userInitials}
          userName={userName}
        />
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[220px] flex-col bg-[#1A1F2E]
          transform transition-transform duration-300 lg:hidden
          ${mobileOpen ? 'flex translate-x-0' : 'hidden -translate-x-full'}
        `}
      >
        <SidebarContent
          items={items}
          pathname={pathname}
          userInitials={userInitials}
          userName={userName}
          onNavigate={closeMobile}
        />
      </aside>

      <IconButton
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Открыть меню"
        icon={<Icon icon="lucide:menu" className="h-5 w-5" />}
      />
    </>
  );
}
