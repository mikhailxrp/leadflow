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
  notificationId: string;
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
  markItemRead: (id: string) => void;
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
          id: payload.notificationId,
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

  markItemRead: (id) =>
    set((state) => {
      const target = state.items.find((item) => item.id === id);
      if (!target || target.readAt) return state;

      return {
        unreadCount: Math.max(0, state.unreadCount - 1),
        items: state.items.map((item) =>
          item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      };
    }),
}));
