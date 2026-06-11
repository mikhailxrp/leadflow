import { Badge } from "@/components/ui/Badge";
import SettingsCard from "@/components/settings/SettingsCard";
import SettingsRow from "@/components/settings/SettingsRow";

export default function SystemSection() {
  return (
    <SettingsCard icon="tabler:info-circle" title="О системе">
      <SettingsRow label="Версия">
        <span className="text-[14px] text-[var(--color-text-secondary)]">
          1.0.0
        </span>
      </SettingsRow>

      <SettingsRow label="Лицензия">
        <Badge bg="#D1FAE5" color="#065F46">
          Активна
        </Badge>
      </SettingsRow>

      <SettingsRow label="Действует до">
        <span className="text-[14px] text-[var(--color-text-secondary)]">
          31.12.2026
        </span>
      </SettingsRow>

      <SettingsRow label="Клиент">
        <span className="text-[14px] text-[var(--color-text-secondary)]">
          ООО «Пример»
        </span>
      </SettingsRow>
    </SettingsCard>
  );
}
