"use client";

import { Icon } from "@iconify/react";
import { useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type YandexMode = "utm" | "api";

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

function ConnectedBadge(): ReactNode {
  return (
    <span
      className="
        inline-flex flex-shrink-0 items-center rounded-[20px]
        bg-[#D1FAE5] px-2.5 py-1 text-[12px] font-medium text-[#065F46]
      "
    >
      Подключено
    </span>
  );
}

interface ModeRadioProps {
  id: string;
  name: string;
  checked: boolean;
  onChange: () => void;
  title: string;
  description: string;
}

function ModeRadio({
  id,
  name,
  checked,
  onChange,
  title,
  description,
}: ModeRadioProps): ReactNode {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
      <input
        id={id}
        type="radio"
        name={name}
        checked={checked}
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
            ${checked ? "opacity-100" : "opacity-0"}
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

export default function YandexDirectCard(): ReactNode {
  const [mode, setMode] = useState<YandexMode>("utm");
  const [oauthConnected, setOauthConnected] = useState(false);
  const [cabinetName, setCabinetName] = useState("");

  const handleUtmMode = (): void => {
    setMode("utm");
    setOauthConnected(false);
    setCabinetName("");
    // TODO: PATCH /api/settings { yandexMode: 'UTM' }
    console.log("Saved: UTM mode");
  };

  const handleApiMode = (): void => {
    setMode("api");
    // TODO: PATCH /api/settings { yandexMode: 'API' }
    console.log("Saved: API mode");
  };

  const handleConnect = (): void => {
    // TODO: OAuth Yandex
    console.log("OAuth Yandex");
    setOauthConnected(true);
    setCabinetName("ООО Пример Директ");
  };

  const handleDisconnect = (): void => {
    setOauthConnected(false);
    setCabinetName("");
  };

  const badge =
    mode === "utm" ? (
      <UtmModeBadge />
    ) : oauthConnected ? (
      <ConnectedBadge />
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
            checked={mode === "utm"}
            onChange={handleUtmMode}
            title="UTM-метки"
            description="Работает сразу. Данные берутся из параметров URL."
          />
          <ModeRadio
            id="yandex-mode-api"
            name="yandex-mode"
            checked={mode === "api"}
            onChange={handleApiMode}
            title="Полный API"
            description="Кампания, группа объявлений, ключевая фраза, устройство, регион. Требует доступа к рекламному кабинету."
          />
        </div>

        <div
          className={`
            overflow-hidden transition-all duration-150
            ${mode === "api" ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"}
          `}
        >
          {!oauthConnected ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleConnect}
            >
              Подключить кабинет Яндекса
              <Icon icon="tabler:external-link" className="h-4 w-4" />
            </Button>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center">
                <Icon
                  icon="tabler:circle-check"
                  className="h-4 w-4 flex-shrink-0 text-[#10B981]"
                  aria-hidden="true"
                />
                <span className="ml-2 text-[13px] text-[var(--color-text-primary)]">
                  Кабинет подключён: {cabinetName}
                </span>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDisconnect}
              >
                Отключить
              </Button>
            </div>
          )}
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
    </Card>
  );
}
