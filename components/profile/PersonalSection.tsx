'use client';

import Input from '@/components/ui/Input';
import ProfileRow from '@/components/profile/ProfileRow';
import ProfileSectionCard from '@/components/profile/ProfileSectionCard';

interface PersonalSectionProps {
  name: string;
  onNameChange: (name: string) => void;
}

export default function PersonalSection({ name, onNameChange }: PersonalSectionProps) {
  return (
    <ProfileSectionCard icon="tabler:user" title="Личные данные">
      <ProfileRow label="ФИО">
        <div className="flex-1">
          <Input value={name} onChange={(e) => onNameChange(e.target.value)} />
        </div>
      </ProfileRow>
    </ProfileSectionCard>
  );
}
