'use client';

import { useEffect, useState } from 'react';
import Input from '@/components/ui/Input';
import ProfileRow from '@/components/profile/ProfileRow';
import ProfileSectionCard from '@/components/profile/ProfileSectionCard';

interface PersonalState {
  firstName: string;
  lastName: string;
  displayName: string;
}

const INITIAL_STATE: PersonalState = {
  firstName: 'Алексей',
  lastName: 'Дмитриев',
  displayName: 'Алексей Д.',
};

interface PersonalSectionProps {
  onDirtyChange: (dirty: boolean) => void;
}

function isStateDirty(state: PersonalState): boolean {
  return JSON.stringify(state) !== JSON.stringify(INITIAL_STATE);
}

export default function PersonalSection({ onDirtyChange }: PersonalSectionProps) {
  const [state, setState] = useState<PersonalState>(INITIAL_STATE);

  useEffect(() => {
    onDirtyChange(isStateDirty(state));
  }, [state, onDirtyChange]);

  function update<K extends keyof PersonalState>(key: K, value: PersonalState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <ProfileSectionCard icon="tabler:user" title="Личные данные">
      <ProfileRow label="Имя">
        <div className="flex flex-1 gap-3">
          <div className="flex-1">
            <Input
              value={state.firstName}
              onChange={(e) => update('firstName', e.target.value)}
            />
          </div>
          <div className="flex-1">
            <Input
              value={state.lastName}
              onChange={(e) => update('lastName', e.target.value)}
            />
          </div>
        </div>
      </ProfileRow>

      <ProfileRow label="Отображаемое имя">
        <div className="flex flex-1 flex-col">
          <Input
            value={state.displayName}
            onChange={(e) => update('displayName', e.target.value)}
          />
          <span className="mt-1 text-[11px] text-[var(--color-text-tertiary)]">
            Отображается в интерфейсе и комментариях
          </span>
        </div>
      </ProfileRow>
    </ProfileSectionCard>
  );
}
