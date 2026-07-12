'use client';

import { Icon } from '@iconify/react';
import { useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Toast from '@/components/ui/Toast';

type YandexMode = 'UTM' | 'FULL';

interface YandexDirectCardProps {
  initialMode: YandexMode;
  readOnly: boolean;
}

function YandexIcon(): ReactNode {
  return (
    <div
      className="
        flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md
        bg-[#FFCC00]
      "
      aria-hidden="true"
    >
      <span className="text-[18px] font-bold text-[#EF4444]">Я</span>
    </div>
  );
}

function UtmModeBadge(): ReactNode {
  return (
    <span
      className="
        inline-flex flex-shrink-0 items-center rounded-[20px]
        border border-[var(--color-border)] border-[0.5px]
        bg-[var(--color-bg-surface-2)] px-2.5 py-1
        text-[12px] font-medium text-[var(--color-text-secondary)]
      "
    >
      UTM-режим
    </span>
  );
}

function NotConfiguredBadge(): ReactNode {
  return (
    <span
      className="
        inline-flex flex-shrink-0 items-center rounded-[20px]
        border border-[var(--color-border)] border-[0.5px]
        bg-[var(--color-bg-surface-2)] px-2.5 py-1
        text-[12px] font-medium text-[var(--color-text-secondary)]
      "
    >
      Не настроено
    </span>
  );
}

interface ModeRadioProps {
  id: string;
  name: string;
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  title: string;
  description: string;
}

function ModeRadio({
  id,
  name,
  checked,
  disabled,
  onChange,
  title,
  description,
}: ModeRadioProps): ReactNode {
  return (
    <label
      htmlFor={id}
      className={`flex items-start gap-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
    >
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="peer sr-only"
      />
      <span
        className="
          mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center
          rounded-full border border-[var(--color-border)]
          peer-checked:border-[#10B981]
        "
        aria-hidden="true"
      >
        <span
          className={`
            h-2 w-2 rounded-full bg-[#10B981]
            ${checked ? 'opacity-100' : 'opacity-0'}
          `}
        />
      </span>
      <span>
        <span className="text-[14px] font-medium text-[var(--color-text-primary)]">
          {title}
        </span>
        <p className="mt-0.5 text-[12px] text-[var(--color-text-secondary)]">
          {description}
        </p>
      </span>
    </label>
  );
}

export default function YandexDirectCard({
  initialMode,
  readOnly,
}: YandexDirectCardProps): ReactNode {
  const [mode, setMode] = useState<YandexMode>(initialMode);
  const [toast, setToast] = useState<string | null>(null);

  async function handleModeChange(nextMode: YandexMode): Promise<void> {
    if (readOnly || nextMode === mode) return;

    const previousMode = mode;
    setMode(nextMode);

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yandexMode: nextMode }),
      });

      if (!response.ok) {
        setMode(previousMode);
        setToast('Не удалось сохранить режим Яндекс Директа');
      }
    } catch (error) {
      console.error('Failed to update yandexMode:', error);
      setMode(previousMode);
      setToast('Не удалось сохранить режим Яндекс Директа');
    }
  }

  const badge = mode === 'UTM' ? <UtmModeBadge /> : <NotConfiguredBadge />;

  return (
    <Card padding="none" className="p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <YandexIcon />
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">
            Яндекс Директ
          </h2>
        </div>
        {badge}
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <p className="text-[13px] text-[var(--color-text-secondary)]">
          Выберите режим получения данных о рекламе:
        </p>

        <div
          className="flex flex-col gap-3"
          role="radiogroup"
          aria-label="Режим Яндекс Директ"
        >
          <ModeRadio
            id="yandex-mode-utm"
            name="yandex-mode"
            checked={mode === 'UTM'}
            disabled={readOnly}
            onChange={() => handleModeChange('UTM')}
            title="UTM-метки"
            description="Работает сразу. Данные берутся из параметров URL."
          />
          <ModeRadio
            id="yandex-mode-full"
            name="yandex-mode"
            checked={mode === 'FULL'}
            disabled={readOnly}
            onChange={() => handleModeChange('FULL')}
            title="Полный API"
            description="Кампания, группа объявлений, ключевая фраза, устройство, регион. Требует доступа к рекламному кабинету."
          />
        </div>

        <div
          className={`
            overflow-hidden transition-all duration-150
            ${mode === 'FULL' ? 'max-h-[120px] opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          <Button type="button" variant="primary" size="md" disabled title="Полный режим появится в следующей фазе">
            Подключить кабинет Яндекса
            <Icon icon="tabler:external-link" className="h-4 w-4" />
          </Button>
          <p className="mt-2 text-[12px] text-[var(--color-text-tertiary)]">
            Полный режим появится в следующей фазе.
          </p>
        </div>
      </div>

      <p
        className="
          mt-4 border-t border-[var(--color-border)] border-[0.5px] py-3 px-3
          text-[12px] text-[var(--color-text-tertiary)]
        "
      >
        Минимальный режим (UTM) работает без дополнительных настроек. Полный
        режим требует доступа к рекламному кабинету Яндекс Директа.
      </p>

      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </Card>
  );
}
