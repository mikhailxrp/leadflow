'use client';

import { Icon } from '@iconify/react';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Toast from '@/components/ui/Toast';
import { YANDEX_MACRO_FIELDS } from '@/constants/yandexMacros';

const COPY_RESET_MS = 2000;

/** Скрытые поля формы, которые клиент добавляет на своём сайте для «Полного» режима. */
const YANDEX_HIDDEN_FIELDS: Array<{ field: string; label: string }> = [
  { field: 'yclid', label: 'ID клика' },
  { field: YANDEX_MACRO_FIELDS.CAMPAIGN_ID, label: 'ID кампании' },
  { field: YANDEX_MACRO_FIELDS.GBID, label: 'ID группы объявлений' },
  { field: YANDEX_MACRO_FIELDS.KEYWORD, label: 'ключевая фраза' },
  { field: YANDEX_MACRO_FIELDS.DEVICE_TYPE, label: 'тип устройства' },
  { field: YANDEX_MACRO_FIELDS.REGION_NAME, label: 'регион' },
];

/** Строка для «Дополнительных параметров URL» кампании Директа — поле=макрос через `&`. */
const YANDEX_TRACKING_TEMPLATE = YANDEX_HIDDEN_FIELDS.map(
  ({ field }) => `${field}={${field}}`,
).join('&');

type YandexMode = 'UTM' | 'FULL';

interface YandexDirectCardProps {
  initialMode: YandexMode;
  initialConnected: boolean;
  initialLogin: string | null;
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
  initialConnected,
  initialLogin,
  readOnly,
}: YandexDirectCardProps): ReactNode {
  const router = useRouter();
  const [mode, setMode] = useState<YandexMode>(initialMode);
  const [connected, setConnected] = useState(initialConnected);
  const [login, setLogin] = useState(initialLogin);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [templateCopied, setTemplateCopied] = useState(false);

  async function handleCopyTemplate(): Promise<void> {
    try {
      await navigator.clipboard.writeText(YANDEX_TRACKING_TEMPLATE);
      setTemplateCopied(true);
      setTimeout(() => setTemplateCopied(false), COPY_RESET_MS);
    } catch (error) {
      console.error('Failed to copy Yandex tracking template:', error);
    }
  }

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

  async function handleDisconnect(): Promise<void> {
    if (readOnly || disconnecting) return;

    setDisconnecting(true);

    try {
      const response = await fetch('/api/integrations/yandex', { method: 'DELETE' });

      if (!response.ok) {
        setToast('Не удалось отключить кабинет Яндекса');
        return;
      }

      setConnected(false);
      setLogin(null);
      router.refresh();
    } catch (error) {
      console.error('Failed to disconnect Yandex:', error);
      setToast('Не удалось отключить кабинет Яндекса');
    } finally {
      setDisconnecting(false);
    }
  }

  const badge = connected ? (
    <ConnectedBadge />
  ) : mode === 'UTM' ? (
    <UtmModeBadge />
  ) : (
    <NotConfiguredBadge />
  );

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
            ${mode === 'FULL' ? 'max-h-[720px] opacity-100' : 'max-h-0 opacity-0'}
          `}
        >
          {connected ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[13px] text-[var(--color-text-primary)]">
                Подключено{login ? `: ${login}` : ''}
              </span>
              {!readOnly && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={disconnecting}
                  onClick={handleDisconnect}
                >
                  Отключить
                </Button>
              )}
            </div>
          ) : readOnly ? (
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              Кабинет не подключён.
            </p>
          ) : (
            <a
              href="/api/integrations/yandex/authorize"
              className="
                inline-flex h-[36px] items-center justify-center gap-2 rounded-[6px]
                border border-transparent bg-[#10B981] px-[14px]
                text-[13px] font-medium text-white
                transition-all duration-150
                hover:bg-[#0E9E6E]
              "
            >
              Подключить кабинет Яндекса
              <Icon icon="tabler:external-link" className="h-4 w-4" />
            </a>
          )}
          <p className="mt-2 text-[12px] text-[var(--color-text-tertiary)]">
            {connected
              ? 'Кампания, группа объявлений, ключевая фраза, устройство и регион подгружаются для лидов с рекламы.'
              : 'Подключите рекламный кабинет, чтобы получать кампанию, группу объявлений, ключевую фразу, устройство и регион.'}
          </p>

          <div
            className="
              mt-3 rounded-[6px] border border-[var(--color-border)]
              border-[0.5px] bg-[var(--color-bg-surface-2)] p-3
            "
          >
            <p className="text-[13px] font-medium text-[var(--color-text-primary)]">
              Настройка формы на сайте
            </p>
            <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
              Без этого лиды с рекламы будут сохраняться как обычные — заявка не
              теряется, но подтянуть кампанию и группу объявлений будет не из чего.
              Нужно один раз (передайте разработчику сайта):
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[12px] text-[var(--color-text-secondary)]">
              <li>
                Добавить параметры ниже в «Дополнительные параметры URL» кампании
                Яндекс Директа (через <code className="font-mono">&amp;</code>, если
                там уже есть UTM-метки).
              </li>
              <li>
                На форме сайта добавить скрытые поля с такими же именами — их
                значения должны браться из одноимённых GET-параметров ссылки. У
                Tilda и большинства конструкторов форм WordPress это делается без
                кода, через настройку поля («значение из параметра URL»).
              </li>
            </ol>

            <p className="mt-3 text-[12px] font-medium text-[var(--color-text-primary)]">
              Параметры для трекинг-шаблона
            </p>
            <div className="mt-1.5 flex flex-col gap-2 sm:flex-row sm:items-start">
              <code
                className="
                  block flex-1 overflow-x-auto rounded-[6px]
                  border border-[var(--color-border)] border-[0.5px]
                  bg-[var(--color-bg-surface)] px-3 py-2
                  font-mono text-[12px] text-[var(--color-text-primary)]
                "
              >
                {YANDEX_TRACKING_TEMPLATE}
              </code>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                icon={templateCopied ? undefined : <Icon icon="lucide:copy" className="h-4 w-4" />}
                className="flex-shrink-0"
                onClick={handleCopyTemplate}
              >
                {templateCopied ? 'Скопировано ✓' : 'Скопировать'}
              </Button>
            </div>

            <p className="mt-3 text-[12px] font-medium text-[var(--color-text-primary)]">
              Скрытые поля формы
            </p>
            <ul className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              {YANDEX_HIDDEN_FIELDS.map(({ field, label }) => (
                <li key={field} className="text-[12px] text-[var(--color-text-secondary)]">
                  <code className="font-mono text-[var(--color-text-primary)]">{field}</code>
                  {' — '}
                  {label}
                </li>
              ))}
            </ul>
          </div>
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
