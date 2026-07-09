import { create } from 'zustand';
import type { EventType } from '@prisma/client';

export interface NotificationItem {
  id: string;
  type: EventType;
  leadId: string | null;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NewLeadSsePayload {
  leadId: string;
  name: string | null;
  source: string;
}

interface NotificationState {
  items: NotificationItem[];
  unreadCount: number;
  hydrate: (data: { items: NotificationItem[]; unreadCount: number }) => void;
  addFromSse: (payload: NewLeadSsePayload) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  unreadCount: 0,

  hydrate: ({ items, unreadCount }) => set({ items, unreadCount }),

  addFromSse: (payload) =>
    set((state) => ({
      unreadCount: state.unreadCount + 1,
      items: [
        {
          id: `sse-${payload.leadId}-${Date.now()}`,
          type: 'LEAD_CREATED',
          leadId: payload.leadId,
          title: 'Новый лид',
          body: payload.name ?? payload.source,
          readAt: null,
          createdAt: new Date().toISOString(),
        },
        ...state.items,
      ],
    })),

  markAllRead: () =>
    set((state) => ({
      unreadCount: 0,
      items: state.items.map((item) =>
        item.readAt ? item : { ...item, readAt: new Date().toISOString() },
      ),
    })),
}));
