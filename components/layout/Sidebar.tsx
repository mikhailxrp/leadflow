'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';
import IconButton from '@/components/ui/IconButton';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useSidebarCollapse } from '@/components/providers/SidebarCollapseProvider';

interface NavItem {
  label: string;
  icon: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
}

interface SidebarProps {
  items: NavItem[];
  userInitials: string;
  userName: string;
  userAvatarUrl?: string | null;
  profileHref?: string;
}

interface SidebarContentProps {
  items: NavItem[];
  pathname: string;
  userInitials: string;
  userName: string;
  userAvatarUrl?: string | null;
  profileHref?: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

function SidebarContent({
  items,
  pathname,
  userInitials,
  userName,
  userAvatarUrl,
  profileHref,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: SidebarContentProps): ReactNode {
  function isActive(item: NavItem): boolean {
    if (item.active !== undefined) return item.active;
    if (!item.href || item.href === '#') return false;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  }

  const linkClassName = (active: boolean): string => `
    flex items-center gap-3 rounded-[6px] px-3 py-[7px]
    text-[13px] font-medium
    transition-colors duration-150
    ${collapsed ? 'justify-center px-0' : ''}
    ${active
      ? 'bg-[rgba(16,185,129,0.15)] text-[#34D399]'
      : 'text-[#94A3B8] hover:bg-[rgba(255,255,255,0.06)]'
    }
  `;

  return (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-2 py-6 ${collapsed ? 'justify-center px-2' : 'px-6'}`}>
        <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-[#10B981]" />
        {!collapsed && (
          <span className="flex-1 truncate text-base font-medium tracking-wide text-white">
            Лид-Канал
          </span>
        )}
        {onToggleCollapse && !collapsed && (
          <IconButton
            onClick={onToggleCollapse}
            aria-label="Свернуть меню"
            className="text-[#94A3B8] hover:bg-white/[0.06] hover:text-white"
            size="sm"
            icon={<Icon icon="lucide:panel-left-close" className="h-4 w-4" />}
          />
        )}
      </div>

      {onToggleCollapse && collapsed && (
        <div className="px-3 pb-2">
          <IconButton
            onClick={onToggleCollapse}
            aria-label="Развернуть меню"
            className="w-full text-[#94A3B8] hover:bg-white/[0.06] hover:text-white"
            size="sm"
            icon={<Icon icon="lucide:panel-left-open" className="h-4 w-4" />}
          />
        </div>
      )}

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
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                className={className}
              >
                <Icon icon={item.icon} className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {!collapsed && item.label}
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
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
              className={className}
            >
              <Icon icon={item.icon} className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/5 p-4">
        <div className={`flex items-center gap-2 rounded-[6px] ${collapsed ? 'flex-col-reverse py-1' : 'px-2 py-3'}`}>
          {profileHref ? (
            <Link
              href={profileHref}
              onClick={onNavigate}
              aria-label="Профиль пользователя"
              title={collapsed ? userName : undefined}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-[6px] transition-colors duration-150 hover:bg-white/[0.06]"
            >
              <SidebarAvatar initials={userInitials} avatarUrl={userAvatarUrl} />
              {!collapsed && (
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white">
                  {userName}
                </span>
              )}
            </Link>
          ) : (
            <div
              aria-label="Профиль пользователя"
              title={collapsed ? userName : undefined}
              className="flex min-w-0 flex-1 items-center gap-2"
            >
              <SidebarAvatar initials={userInitials} avatarUrl={userAvatarUrl} />
              {!collapsed && (
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white">
                  {userName}
                </span>
              )}
            </div>
          )}
          <ThemeToggle className="text-[#94A3B8] hover:bg-white/[0.06] hover:text-white" />
        </div>
      </div>
    </div>
  );
}

function SidebarAvatar({
  initials,
  avatarUrl,
}: {
  initials: string;
  avatarUrl?: string | null;
}): ReactNode {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className="h-8 w-8 flex-shrink-0 rounded-full border border-white/10 object-cover"
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#252B3B] text-[12px] font-medium text-white">
      {initials}
    </div>
  );
}

export default function Sidebar({ items, userInitials, userName, userAvatarUrl, profileHref }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { collapsed, toggleCollapsed } = useSidebarCollapse();

  function closeMobile(): void {
    setMobileOpen(false);
  }

  return (
    <>
      <aside
        className={`fixed inset-y-0 left-0 z-20 hidden flex-shrink-0 flex-col bg-[var(--color-sidebar-bg)] transition-[width] duration-200 lg:flex ${collapsed ? 'w-[64px]' : 'w-[220px]'}`}
      >
        <SidebarContent
          items={items}
          pathname={pathname}
          userInitials={userInitials}
          userName={userName}
          userAvatarUrl={userAvatarUrl}
          profileHref={profileHref}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
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
          fixed inset-y-0 left-0 z-50 w-[220px] flex-col bg-[var(--color-sidebar-bg)]
          transform transition-transform duration-300 lg:hidden
          ${mobileOpen ? 'flex translate-x-0' : 'hidden -translate-x-full'}
        `}
      >
        <SidebarContent
          items={items}
          pathname={pathname}
          userInitials={userInitials}
          userName={userName}
          userAvatarUrl={userAvatarUrl}
          profileHref={profileHref}
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
