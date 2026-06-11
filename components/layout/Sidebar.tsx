'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';

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

export default function Sidebar({ items, userInitials = 'АД', userName = 'Администратор' }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  function isActive(item: NavItem): boolean {
    if (item.active !== undefined) return item.active;
    if (!item.href || item.href === '#') return false;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  function isProfileActive(): boolean {
    return pathname === '/admin/profile' || pathname.startsWith('/admin/profile/');
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-6">
        <div className="w-2.5 h-2.5 bg-[#10B981] rounded-full" />
        <span className="text-white font-medium text-base tracking-wide">LeadFlow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 mt-2 space-y-1">
        {items.map((item) => (
          <a
            key={item.label}
            href={item.href || '#'}
            onClick={item.onClick}
            className={`
              flex items-center gap-3 px-3 py-[7px] rounded-[6px]
              text-[13px] font-medium
              transition-colors duration-150
              ${isActive(item)
                ? 'bg-[rgba(16,185,129,0.15)] text-[#34D399]'
                : 'text-[#94A3B8] hover:bg-[rgba(255,255,255,0.06)]'
              }
            `}
          >
            <Icon icon={item.icon} className="w-4 h-4 flex-shrink-0" />
            {item.label}
          </a>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-white/5 p-4">
        <Link
          href="/admin/profile"
          onClick={() => setMobileOpen(false)}
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

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-[220px] bg-[#1A1F2E] fixed h-full z-20 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 w-[220px] bg-[#1A1F2E] z-50 flex-col
          transform transition-transform duration-300 lg:hidden
          ${mobileOpen ? 'translate-x-0 flex' : '-translate-x-full hidden'}
        `}
      >
        <SidebarContent />
      </aside>

      {/* Mobile burger trigger — exported as prop for Header to use */}
      <button
        className="lg:hidden p-2 text-[var(--color-text-secondary)]"
        onClick={() => setMobileOpen(true)}
        aria-label="Открыть меню"
      >
        <Icon icon="lucide:menu" className="w-5 h-5" />
      </button>
    </>
  );
}
