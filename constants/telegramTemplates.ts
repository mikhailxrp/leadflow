export type NewLeadForManagerParams = {
  name: string | null;
  source: string;
};

function newLeadForManager({ name, source }: NewLeadForManagerParams): string {
  return `Новый лид: ${name ?? 'без имени'}\nИсточник: ${source}`;
}

/**
 * Реестр текстовых шаблонов Telegram-сообщений. В Phase 13 — одна операционная запись;
 * управленческие шаблоны (эскалация, зависшие лиды, тишина источника) добавляются сюда же в Phase 17.
 */
export const telegramTemplates = {
  newLeadForManager,
} as const;
