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
    case 'LEAD_QUALIFIED':
      return 'Лид помечен целевым';
    case 'LEAD_DISQUALIFIED':
      return 'Лид помечен нецелевым';
    default:
      return 'Событие в журнале';
  }
}

const PLATFORM_EVENT_LABELS = {
  LEAD_CREATED: 'Лид создан',
  STAGE_CHANGED: 'Смена этапа воронки',
  ASSIGNED: 'Лид назначен менеджеру',
  ASSIGNMENT_FAILED: 'Не удалось назначить лид',
  COMMENTED: 'Добавлен комментарий',
  LEAD_UPDATED: 'Данные лида обновлены',
  LEAD_DELETED: 'Лид удалён',
  LEAD_TAKEN_IN_WORK: 'Лид взят в работу',
  LEAD_WON: 'Лид закрыт сделкой',
  LEAD_LOST: 'Лид закрыт отказом',
  DUPLICATE_FLAGGED: 'Обнаружен возможный дубль',
  USER_CREATED: 'Пользователь создан',
  USER_BLOCKED: 'Пользователь заблокирован',
  USER_UNBLOCKED: 'Пользователь разблокирован',
  USER_DELETED: 'Пользователь удалён',
  LOGIN: 'Вход в систему',
  LEAD_OPENED: 'Карточка лида открыта',
  REMINDER_CREATED: 'Напоминание создано',
  REMINDER_FIRED: 'Напоминание сработало',
  REMINDER_FAILED: 'Ошибка отправки напоминания',
  REMINDER_CANCELLED: 'Напоминание отменено',
  LEAD_REACTION_REMINDED: 'Напоминание о реакции на лид',
  LEAD_REACTION_OVERDUE: 'Просрочена реакция на лид',
  LEAD_REACTION_ESCALATED: 'Эскалация реакции на лид',
  LEAD_STAGE_STUCK: 'Лид завис на этапе',
  TASK_CREATED: 'Задача создана',
  TASK_UPDATED: 'Задача обновлена',
  TASK_DONE: 'Задача выполнена',
  TASK_CANCELLED: 'Задача отменена',
  IMPORT_COMPLETED: 'Импорт завершён',
  IMPORT_ROLLED_BACK: 'Импорт отменён (роллбэк)',
  SOURCE_DOWN: 'Источник лидов недоступен',
  SOURCE_RECOVERED: 'Источник лидов восстановлен',
  COMPANY_CREATED: 'Компания создана',
  COMPANY_BLOCKED: 'Компания заблокирована',
  COMPANY_UNBLOCKED: 'Компания разблокирована',
  COMPANY_PAYMENT_UPDATED: 'Дата платежа обновлена',
  COMPANY_ACCESS_GRANTED: 'Доступ маркетолога к компании предоставлен',
  COMPANY_ACCESS_REVOKED: 'Доступ маркетолога к компании отозван',
  PLATFORM_IMPERSONATION_STARTED: 'Начат вход как поддержка',
  PLATFORM_IMPERSONATION_ENDED: 'Завершён вход как поддержка',
  MARKETER_ACCESS_STARTED: 'Начат вход маркетолога в компанию',
  MARKETER_ACCESS_ENDED: 'Завершён вход маркетолога в компанию',
  LEAD_QUALIFIED: 'Лид помечен целевым',
  LEAD_DISQUALIFIED: 'Лид помечен нецелевым',
} satisfies Record<EventType, string>;

export function getPlatformEventLabel(type: EventType): string {
  return PLATFORM_EVENT_LABELS[type];
}
