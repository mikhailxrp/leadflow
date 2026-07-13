'use client';

import { useState, type ReactNode } from 'react';
import IntegrationCard from '@/components/integrations/IntegrationCard';
import SourceHealthIndicator from '@/components/integrations/SourceHealthIndicator';
import WebhookUrl from '@/components/integrations/WebhookUrl';
import Toggle from '@/components/settings/Toggle';
import Toast from '@/components/ui/Toast';
import type { SourceHealthEntry } from '@/lib/integrations/getSourceHealth';

type WebhookSourceKey = 'tilda' | 'wordpress';

interface WebhookSourceCardProps {
  sourceKey: WebhookSourceKey;
  icon: ReactNode;
  title: string;
  description: string;
  extraNote?: ReactNode;
  webhookUrl: string | null;
  health: SourceHealthEntry | undefined;
  initialEnabled: boolean;
  readOnly: boolean;
}

function ConnectedBadge(): ReactNode {
  return (
    <span
      className="
        inline-flex flex-shrink-0 items-center rounded-[20px]
        bg-[#d1fae5] px-2.5 py-1 text-[12px] font-medium text-[#065f46]
      "
    >
      Подключено
    </span>
  );
}

function NotConfiguredBadge(): ReactNode {
  return (
    <span
      className="
        inline-flex flex-shrink-0 items-center rounded-[20px]
        bg-[var(--color-bg-surface-2)] px-2.5 py-1
        text-[12px] font-medium text-[var(--color-text-secondary)]
      "
    >
      Не настроено
    </span>
  );
}

function DisabledBadge(): ReactNode {
  return (
    <span
      className="
        inline-flex flex-shrink-0 items-center rounded-[20px]
        bg-[var(--color-bg-surface-2)] px-2.5 py-1
        text-[12px] font-medium text-[var(--color-text-tertiary)]
      "
    >
      Выключено
    </span>
  );
}

export default function WebhookSourceCard({
  sourceKey,
  icon,
  title,
  description,
  extraNote,
  webhookUrl,
  health,
  initialEnabled,
  readOnly,
}: WebhookSourceCardProps): ReactNode {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  async function handleToggle(next: boolean): Promise<void> {
    if (readOnly || saving) return;

    const previous = enabled;
    setEnabled(next);
    setSaving(true);

    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceEnabled: { [sourceKey]: next } }),
      });

      if (!res.ok) {
        setEnabled(previous);
        setToast(`Не удалось изменить статус источника «${title}»`);
      }
    } catch {
      setEnabled(previous);
      setToast(`Не удалось изменить статус источника «${title}»`);
    } finally {
      setSaving(false);
    }
  }

  const isConnected = health !== undefined && health.status !== 'not_configured';
  const badge = !enabled ? (
    <DisabledBadge />
  ) : isConnected ? (
    <ConnectedBadge />
  ) : (
    <NotConfiguredBadge />
  );

  return (
    <>
      <IntegrationCard
        icon={icon}
        title={title}
        badge={badge}
        toggle={
          <Toggle
            checked={enabled}
            onChange={handleToggle}
            disabled={readOnly || saving}
            aria-label={`Источник ${title}: ${enabled ? 'включён' : 'выключен'}`}
          />
        }
        description={enabled ? description : undefined}
        footer={
          enabled && health ? (
            <div className="mt-3">
              <SourceHealthIndicator
                status={health.status}
                hoursSinceLastUse={health.hoursSinceLastUse}
                thresholdHours={health.thresholdHours}
              />
            </div>
          ) : undefined
        }
      >
        {enabled ? (
          <>
            {webhookUrl ? (
              <WebhookUrl url={webhookUrl} />
            ) : (
              <p className="text-[13px] text-[#DC2626]">
                Не удалось получить URL вебхука — обратитесь к администратору сервера.
              </p>
            )}
            {extraNote}
          </>
        ) : (
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Источник выключен — заявки по нему не принимаются. Включите тумблер, чтобы
            начать получать по нему лиды.
          </p>
        )}
      </IntegrationCard>

      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </>
  );
}
