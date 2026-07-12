/**
 * Источники лида, не привязанные к конкретной настроенной интеграции
 * (`IntegrationSource`) — ручное добавление и универсальный вебхук.
 * В переопределениях норматива (`reactionNorms.bySource`) они делят один
 * общий бакет `OTHER_BYSOURCE_KEY`, а не переопределяются по отдельности.
 */
export const OTHER_SOURCE_TYPES = ['manual', 'api'] as const;

export const OTHER_BYSOURCE_KEY = 'other';

export const OTHER_SOURCE_LABEL = 'Другие источники';
