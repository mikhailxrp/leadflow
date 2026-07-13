/**
 * Единый источник порога и подписей статуса здоровья источника —
 * используется и API (`lib/integrations/getSourceHealth.ts`), и UI (Таск 3),
 * чтобы порог 🟡/🔴 не расходился между вычислением и отображением.
 */

export type SourceHealthStatus = 'active' | 'silent' | 'down' | 'not_configured' | 'disabled';

/**
 * Доля от `sourceHealthThresholdHours`, после которой источник считается «молчит» (🟡),
 * но алерт `SOURCE_DOWN` (`lib/control/checkSourceHealth.ts`) ещё не отправлен.
 */
export const SOURCE_HEALTH_WARNING_RATIO = 0.66;

export const SOURCE_HEALTH_LABELS: Record<SourceHealthStatus, { emoji: string; label: string }> = {
  active: { emoji: '🟢', label: 'Активен' },
  silent: { emoji: '🟡', label: 'Молчит' },
  down: { emoji: '🔴', label: 'Не передаёт заявки' },
  not_configured: { emoji: '⚪', label: 'Не настроено' },
  disabled: { emoji: '⛔', label: 'Выключен' },
};
