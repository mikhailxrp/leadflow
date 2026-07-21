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
  /** User.notificationPreferences.soundEnabled — зеркало настройки для SseProvider. */
  soundEnabled: boolean;
  hydrate: (data: {
    items: NotificationItem[];
    unreadCount: number;
    soundEnabled: boolean;
  }) => void;
  setSoundEnabled: (enabled: boolean) => void;
  addFromSse: (payload: NewLeadSsePayload) => void;
  markAllRead: () => void;
  markItemRead: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  unreadCount: 0,
  soundEnabled: true,

  hydrate: ({ items, unreadCount, soundEnabled }) =>
    set({ items, unreadCount, soundEnabled }),

  setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),

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

  markAllRead: () => set({ items: [], unreadCount: 0 }),

  markItemRead: (id) =>
    set((state) => {
      if (!state.items.some((item) => item.id === id)) return state;

      return {
        unreadCount: Math.max(0, state.unreadCount - 1),
        items: state.items.filter((item) => item.id !== id),
      };
    }),
}));
