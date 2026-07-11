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

export type StuckLeadsSummaryParams = {
  leads: {
    name: string | null;
    days: number;
    stageName: string;
    managerName: string | null;
  }[];
};

function stuckLeadsSummary({ leads }: StuckLeadsSummaryParams): string {
  const lines = leads
    .map(
      (lead) =>
        `• ${lead.name ?? 'без имени'} — ${lead.days} дн. на этапе «${lead.stageName}»${lead.managerName ? `, ${lead.managerName}` : ''}`,
    )
    .join('\n');
  return `Зависшие лиды (${leads.length}):\n${lines}`;
}

export type EndOfDaySummaryParams = {
  leads: { name: string | null; source: string }[];
};

function endOfDaySummary({ leads }: EndOfDaySummaryParams): string {
  const lines = leads.map((lead) => `• ${lead.name ?? 'без имени'} (${lead.source})`).join('\n');
  return `Необработанные за сегодня лиды (${leads.length}):\n${lines}`;
}

export type SourceDownParams = {
  type: string;
  label: string;
  hours: number;
};

function sourceDown({ type, label, hours }: SourceDownParams): string {
  const sourceName = label ? `${type} (${label})` : type;
  return `Источник "${sourceName}" не передаёт заявки последние ${hours} ч`;
}

/**
 * Реестр текстовых шаблонов Telegram-сообщений. Управленческие шаблоны — эскалация,
 * зависшие лиды, конец дня, тишина источника (Phase 17).
 */
export const telegramTemplates = {
  newLeadForManager,
  reactionReminder,
  reactionEscalated,
  stuckLeadsSummary,
  endOfDaySummary,
  sourceDown,
} as const;
