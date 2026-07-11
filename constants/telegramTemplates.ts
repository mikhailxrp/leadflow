export type NewLeadForManagerParams = {
  name: string | null;
  source: string;
};

function newLeadForManager({ name, source }: NewLeadForManagerParams): string {
  return `Новый лид: ${name ?? 'без имени'}\nИсточник: ${source}`;
}

export type ReactionReminderParams = {
  name: string | null;
  minutes: number;
};

function reactionReminder({ name, minutes }: ReactionReminderParams): string {
  return `Лид ${name ?? 'без имени'} ждёт ответа ${Math.round(minutes)} мин`;
}

export type ReactionEscalatedParams = {
  name: string | null;
  minutes: number;
  manager: string;
};

function reactionEscalated({ name, minutes, manager }: ReactionEscalatedParams): string {
  return `Лид ${name ?? 'без имени'} не обработан ${Math.round(minutes)} мин, ответственный: ${manager}`;
}

/**
 * Реестр текстовых шаблонов Telegram-сообщений. Управленческие шаблоны (эскалация, зависшие
 * лиды, тишина источника) — Phase 17.
 */
export const telegramTemplates = {
  newLeadForManager,
  reactionReminder,
  reactionEscalated,
} as const;
