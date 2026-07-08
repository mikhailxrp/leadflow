import SettingsCard from "@/components/settings/SettingsCard";
import SettingsRow from "@/components/settings/SettingsRow";

interface SystemSectionProps {
  companyName: string;
  nextPaymentAt: Date | null;
}

export default function SystemSection({ companyName, nextPaymentAt }: SystemSectionProps) {
  return (
    <SettingsCard icon="tabler:info-circle" title="О системе">
      <SettingsRow label="Версия">
        <span className="text-[14px] text-[var(--color-text-secondary)]">
          1.0.0
        </span>
      </SettingsRow>

      <SettingsRow label="Действует до">
        <span className="text-[14px] text-[var(--color-text-secondary)]">
          {nextPaymentAt ? nextPaymentAt.toLocaleDateString('ru-RU') : '—'}
        </span>
      </SettingsRow>

      <SettingsRow label="Клиент">
        <span className="text-[14px] text-[var(--color-text-secondary)]">
          {companyName}
        </span>
      </SettingsRow>
    </SettingsCard>
  );
}
