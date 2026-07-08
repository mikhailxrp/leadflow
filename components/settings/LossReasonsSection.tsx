import SettingsCard from '@/components/settings/SettingsCard';
import LossReasonsList, { type LossReasonItem } from '@/components/settings/LossReasonsList';

interface LossReasonsSectionProps {
  initialReasons: LossReasonItem[];
}

export default function LossReasonsSection({ initialReasons }: LossReasonsSectionProps) {
  return (
    <SettingsCard icon="lucide:x-circle" title="Причины отказа">
      <LossReasonsList initialReasons={initialReasons} />
    </SettingsCard>
  );
}
