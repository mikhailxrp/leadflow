'use client';

import { createContext, startTransition, useContext, useEffect, useState, type ReactNode } from 'react';

interface SidebarCollapseContextValue {
  collapsed: boolean;
  toggleCollapsed: () => void;
}

const SidebarCollapseContext = createContext<SidebarCollapseContextValue>({
  collapsed: false,
  toggleCollapsed: () => {},
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

  return (
    <SidebarCollapseContext.Provider value={{ collapsed, toggleCollapsed }}>
      {children}
    </SidebarCollapseContext.Provider>
  );
}
