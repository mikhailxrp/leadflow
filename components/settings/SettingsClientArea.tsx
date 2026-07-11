'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import Button from '@/components/ui/Button';
import SecuritySection from '@/components/settings/SecuritySection';

type DirtyKey = 'security';

interface SettingsDirtyContextValue {
  onDirtyChange: (key: DirtyKey, dirty: boolean) => void;
}

const SettingsDirtyContext = createContext<SettingsDirtyContextValue | null>(null);

interface SettingsDirtyProviderProps {
  children: ReactNode;
}

export function SettingsDirtyProvider({ children }: SettingsDirtyProviderProps) {
  const [dirtyFlags, setDirtyFlags] = useState<Record<DirtyKey, boolean>>({
    security: false,
  });

  const onDirtyChange = useCallback((key: DirtyKey, dirty: boolean) => {
    setDirtyFlags((prev) => (prev[key] === dirty ? prev : { ...prev, [key]: dirty }));
  }, []);

  const isDirty = Object.values(dirtyFlags).some(Boolean);

  const value = useMemo(() => ({ onDirtyChange }), [onDirtyChange]);

  function handleSave() {
    setDirtyFlags({
      security: false,
    });
  }

  return (
    <SettingsDirtyContext.Provider value={value}>
      {children}
      {isDirty && (
        <footer
          className="
            sticky bottom-0 z-20
            flex justify-end
            border-t-[0.5px] border-[var(--color-border)]
            bg-[var(--color-bg-surface)] px-6 py-3
          "
        >
          <Button size="md" onClick={handleSave}>
            Сохранить изменения
          </Button>
        </footer>
      )}
    </SettingsDirtyContext.Provider>
  );
}

function useSettingsDirty() {
  const context = useContext(SettingsDirtyContext);
  if (!context) {
    throw new Error('useSettingsDirty must be used within SettingsDirtyProvider');
  }
  return context;
}

export default function SettingsSections() {
  const { onDirtyChange } = useSettingsDirty();

  return (
    <SecuritySection onDirtyChange={(dirty) => onDirtyChange('security', dirty)} />
  );
}
