'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/ui/Toast';
import {
  useNotificationStore,
  type NewLeadSsePayload,
  type NotificationItem,
} from '@/store/notificationStore';

interface SseProviderProps {
  initialItems: NotificationItem[];
  initialUnreadCount: number;
  children: ReactNode;
}

interface ActiveToast {
  leadId: string;
  title: string;
  message: string;
}

export default function SseProvider({
  initialItems,
  initialUnreadCount,
  children,
}: SseProviderProps): ReactNode {
  const hydrate = useNotificationStore((state) => state.hydrate);
  const addFromSse = useNotificationStore((state) => state.addFromSse);
  const router = useRouter();
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    hydrate({ items: initialItems, unreadCount: initialUnreadCount });
  }, [hydrate, initialItems, initialUnreadCount]);

  useEffect(() => {
    const source = new EventSource('/api/stream');

    source.onmessage = (event: MessageEvent<string>) => {
      let payload: NewLeadSsePayload;
      try {
        payload = JSON.parse(event.data) as NewLeadSsePayload;
      } catch {
        return;
      }

      addFromSse(payload);
      setToast({
        leadId: payload.leadId,
        title: 'Новый лид',
        message: payload.name ?? payload.source,
      });
    };

    return () => source.close();
  }, [addFromSse]);

  return (
    <>
      {children}
      {toast && (
        <Toast
          title={toast.title}
          message={toast.message}
          actionLabel="Открыть"
          onAction={() => {
            router.push(`/leads/${toast.leadId}`);
            setToast(null);
          }}
          onClose={() => setToast(null)}
        />
      )}
    </>
  );
}
