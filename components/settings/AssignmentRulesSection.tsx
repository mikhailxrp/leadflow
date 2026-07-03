import SettingsCard from '@/components/settings/SettingsCard';
import AssignmentRulesList, {
  type AssignmentRuleItem,
  type AssignmentRuleUser,
} from '@/components/settings/AssignmentRulesList';

interface AssignmentRulesSectionProps {
  initialRules: AssignmentRuleItem[];
  users: AssignmentRuleUser[];
}

export default function AssignmentRulesSection({
  initialRules,
  users,
}: AssignmentRulesSectionProps) {
  return (
    <SettingsCard icon="tabler:route" title="Правила назначения">
      <AssignmentRulesList initialRules={initialRules} users={users} />
    </SettingsCard>
  );
}
