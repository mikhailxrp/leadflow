import { type ReactNode } from "react";
import Link from "next/link";
import { SourceBadge } from "@/components/ui/Badge";
import Card from "@/components/ui/Card";

interface UtmData {
  source: string;
  medium: string;
  campaign: string;
  term: string;
}

interface LeadMarketingProps {
  referrer: string;
  landingPage: string;
  utm: UtmData;
}

function MarketingIcon() {
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
        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
      />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
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
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="shrink-0 text-[13px] text-[var(--color-text-secondary)]">
        {label}
      </span>
      <div className="text-right text-[13px] text-[var(--color-text-primary)]">
        {children}
      </div>
    </div>
  );
}

export default function LeadMarketing({
  referrer,
  landingPage,
  utm,
}: LeadMarketingProps) {
  const utmRows = [
    { key: "utm_source", value: utm.source },
    { key: "utm_medium", value: utm.medium },
    { key: "utm_campaign", value: utm.campaign },
    { key: "utm_term", value: utm.term },
  ];

  return (
    <Card padding="lg">
      <h2 className="mb-4 flex items-center gap-2 text-[14px] font-medium text-[var(--color-text-primary)]">
        <MarketingIcon />
        Маркетинговые данные
      </h2>

      <DetailRow label="Источник">
        <SourceBadge source="organic" icon={<GlobeIcon />} />
      </DetailRow>

      <div className="border-t border-[var(--color-border)] border-[0.5px] py-3 px-3">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-[var(--color-text-tertiary)]">
          UTM метки
        </p>
        <div className="flex flex-col gap-2">
          {utmRows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-4"
            >
              <span className="font-mono text-[12px] text-[var(--color-text-secondary)]">
                {row.key}
              </span>
              <span className="font-mono text-[12px] text-[var(--color-text-primary)]">
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--color-border)] border-[0.5px] px-3">
        <DetailRow label="Реферер">
          <span className="break-all">{referrer}</span>
        </DetailRow>
        <DetailRow label="Landing page">
          <Link
            href={landingPage}
            className="text-[var(--color-primary)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
          >
            {landingPage}
          </Link>
        </DetailRow>
      </div>
    </Card>
  );
}
