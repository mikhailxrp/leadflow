import type { EventType } from '@prisma/client';

export interface HistoryEventItem {
  id: string;
  type: EventType;
  createdAt: string; // ISO string for client rendering
  userName: string | null;
  lossReasonLabel: string | null;
}

export function getEventLabel(
  event: Pick<HistoryEventItem, 'type' | 'userName' | 'lossReasonLabel'>,
): string {
  switch (event.type) {
    case 'LEAD_CREATED':
      return 'Лид создан';
    case 'LEAD_OPENED':
      return 'Карточка открыта';
    case 'LEAD_UPDATED':
      return 'Данные контакта обновлены';
    case 'LEAD_TAKEN_IN_WORK':
      return `${event.userName ?? 'Менеджер'} взял лид в работу`;
    case 'LEAD_WON':
      return 'Лид закрыт сделкой';
    case 'LEAD_LOST':
      return event.lossReasonLabel
        ? `Лид закрыт отказом: ${event.lossReasonLabel}`
        : 'Лид закрыт отказом';
    case 'DUPLICATE_FLAGGED':
      return 'Обнаружен возможный дубль';
    case 'LEAD_DELETED':
      return 'Лид удалён';
    case 'COMMENTED':
      return `${event.userName ?? 'Пользователь'} добавил комментарий`;
    default:
      return 'Событие в журнале';
  }
}
