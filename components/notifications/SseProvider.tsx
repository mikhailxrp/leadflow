'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Toast from '@/components/ui/Toast';
import { playNotificationSound } from '@/lib/notifications/sound';
import {
  useNotificationStore,
  type NewLeadSsePayload,
  type NotificationItem,
} from '@/store/notificationStore';

interface SseProviderProps {
  initialItems: NotificationItem[];
  initialUnreadCount: number;
  initialSoundEnabled: boolean;
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
  initialSoundEnabled,
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
    hydrate({
      items: initialItems,
      unreadCount: initialUnreadCount,
      soundEnabled: initialSoundEnabled,
    });
  }, [hydrate, initialItems, initialUnreadCount, initialSoundEnabled]);

  useEffect(() => {
    const source = new EventSource('/api/stream');

    source.onerror = () => {
      console.error('[sse] connection error, readyState:', source.readyState);
    };

    source.onmessage = (event: MessageEvent<string>) => {
      let payload: NewLeadSsePayload;
      try {
        payload = JSON.parse(event.data) as NewLeadSsePayload;
      } catch {
        return;
      }

      addFromSse(payload);
      // getState(), а не подписка: иначе переключение звука в профиле
      // пересоздавало бы EventSource и рвало поток уведомлений.
      if (useNotificationStore.getState().soundEnabled) {
        playNotificationSound();
      }
      setToast({
        leadId: payload.leadId,
        title: 'Новый лид',
        message: payload.name ?? payload.source,
      });
      router.refresh();
    };

    return () => source.close();
  }, [addFromSse, router]);

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
