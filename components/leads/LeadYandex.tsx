import { type ReactNode } from "react";
import Card from "@/components/ui/Card";

interface LeadYandexProps {
  campaign: string;
  adGroup: string;
  keyword: string;
  device: string;
  region: string;
}

function YandexIcon() {
  return (
    <svg
      className="h-4 w-4 text-[var(--color-text-tertiary)]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
      />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-tertiary)]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-tertiary)]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] border-[0.5px] py-3 px-3 last:border-0">
      <span className="shrink-0 text-[13px] text-[var(--color-text-secondary)]">
        {label}
      </span>
      <div className="flex items-center justify-end gap-2 text-right text-[13px] text-[var(--color-text-primary)]">
        {children}
      </div>
    </div>
  );
}

export default function LeadYandex({
  campaign,
  adGroup,
  keyword,
  device,
  region,
}: LeadYandexProps) {
  return (
    <Card padding="lg">
      <h2 className="mb-5 flex items-center gap-2 text-[14px] font-medium text-[var(--color-text-primary)]">
        <YandexIcon />
        Данные Яндекс Директ
      </h2>

      <DetailRow label="Кампания">{campaign}</DetailRow>
      <DetailRow label="Группа объявлений">{adGroup}</DetailRow>
      <DetailRow label="Ключевая фраза">{keyword}</DetailRow>
      <DetailRow label="Устройство">
        <MonitorIcon />
        {device}
      </DetailRow>
      <DetailRow label="Регион">
        <MapPinIcon />
        {region}
      </DetailRow>
    </Card>
  );
}
