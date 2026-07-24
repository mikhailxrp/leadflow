'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import IconButton from '@/components/ui/IconButton';
import NotificationDropdown from '@/components/notifications/NotificationDropdown';
import { useNotificationStore } from '@/store/notificationStore';

export default function NotificationBell(): ReactNode {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <IconButton
        aria-label="Уведомления"
        onClick={() => setOpen((prev) => !prev)}
        icon={
          <span className="relative inline-flex">
            <Icon icon="lucide:bell" className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-medium leading-none text-white"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </span>
        }
      />
      {open && <NotificationDropdown anchorRef={containerRef} onClose={() => setOpen(false)} />}
    </div>
  );
}
