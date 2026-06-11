import Card from "@/components/ui/Card";

interface LeadCustomFieldsProps {
  companySize: string;
  industry: string;
  position: string;
  inn: string;
}

function BriefcaseIcon() {
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
        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] border-[0.5px] py-3 px-3 last:border-0">
      <span className="shrink-0 text-[13px] text-[var(--color-text-secondary)]">
        {label}
      </span>
      <span className="text-right text-[13px] text-[var(--color-text-primary)]">
        {value}
      </span>
    </div>
  );
}

export default function LeadCustomFields({
  companySize,
  industry,
  position,
  inn,
}: LeadCustomFieldsProps) {
  return (
    <Card padding="lg">
      <h2 className="mb-5 flex items-center gap-2 text-[14px] font-medium text-[var(--color-text-primary)]">
        <BriefcaseIcon />
        Дополнительные поля
      </h2>

      <DetailRow label="Размер компании" value={companySize} />
      <DetailRow label="Сфера деятельности" value={industry} />
      <DetailRow label="Должность" value={position} />
      <DetailRow label="ИНН" value={inn} />
    </Card>
  );
}
