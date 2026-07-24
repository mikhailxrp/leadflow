'use client';

import { createContext, startTransition, useContext, useEffect, useState, type ReactNode } from 'react';

interface SidebarCollapseContextValue {
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** Открыт ли мобильный drawer (< lg). Не сохраняется между сессиями. */
  mobileOpen: boolean;
  openMobile: () => void;
  closeMobile: () => void;
}

const SidebarCollapseContext = createContext<SidebarCollapseContextValue>({
  collapsed: false,
  toggleCollapsed: () => {},
  mobileOpen: false,
  openMobile: () => {},
  closeMobile: () => {},
});

export function useSidebarCollapse(): SidebarCollapseContextValue {
  return useContext(SidebarCollapseContext);
}

interface SidebarCollapseProviderProps {
  children: ReactNode;
  storageKey?: string;
}

export default function SidebarCollapseProvider({
  children,
  storageKey = 'sidebar_collapsed',
}: SidebarCollapseProviderProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    const resolved = stored !== null ? stored === '1' : window.innerWidth < 1440;
    startTransition(() => setCollapsed(resolved));
  }, [storageKey]);

  function toggleCollapsed(): void {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(storageKey, next ? '1' : '0');
      return next;
    });
  }

  function openMobile(): void {
    setMobileOpen(true);
  }

  function closeMobile(): void {
    setMobileOpen(false);
  }

  return (
    <SidebarCollapseContext.Provider
      value={{ collapsed, toggleCollapsed, mobileOpen, openMobile, closeMobile }}
    >
      {children}
    </SidebarCollapseContext.Provider>
  );
}
