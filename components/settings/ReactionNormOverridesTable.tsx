'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Select from '@/components/ui/Select';
import Toast from '@/components/ui/Toast';
import SettingsCard from '@/components/settings/SettingsCard';
import { OTHER_BYSOURCE_KEY, OTHER_SOURCE_LABEL } from '@/constants/leadSources';

export interface StageOption {
  id: string;
  name: string;
}

export interface UserOption {
  id: string;
  name: string;
  isBlocked: boolean;
}

type OverrideMap = 'bySource' | 'byStage' | 'byUser';

const KNOWN_SOURCES_LIST_ID = 'reaction-norm-known-sources';

async function patchOverride(map: OverrideMap, key: string, value: number | null): Promise<boolean> {
  try {
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reactionNorms: { [map]: { [key]: value } } }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

interface KeyPickerProps {
  value: string;
  onChange: (value: string) => void;
  excludeKeys: string[];
}

function renderSourceKeyPicker({ value, onChange }: KeyPickerProps): ReactNode {
  return (
    <input
      type="text"
      list={KNOWN_SOURCES_LIST_ID}
      placeholder="Источник (например, tilda)"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="
        h-8 min-w-0 flex-1 rounded-[6px] border-[0.5px] border-[var(--color-border)]
        bg-[var(--color-bg-surface)] px-2 text-[13px] text-[var(--color-text-primary)]
        outline-none transition-all duration-150
        focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
      "
    />
  );
}

function makeIdKeyPicker(options: { id: string; name: string }[], placeholder: string) {
  return function renderIdKeyPicker({ value, onChange, excludeKeys }: KeyPickerProps): ReactNode {
    const available = options.filter((option) => !excludeKeys.includes(option.id));
    return (
      <Select
        value={value}
        onChange={onChange}
        options={available.map((option) => ({ value: option.id, label: option.name }))}
        placeholder={placeholder}
        className="min-w-0 flex-1"
      />
    );
  };
}

interface OverrideRowProps {
  label: string;
  isUnknown: boolean;
  value: number;
  isPendingDelete: boolean;
  onCommitValue: (next: number) => Promise<boolean>;
  onDeleteRequest: () => void;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
}

function OverrideRow({
  label,
  isUnknown,
  value,
  isPendingDelete,
  onCommitValue,
  onDeleteRequest,
  onDeleteCancel,
  onDeleteConfirm,
}: OverrideRowProps): ReactNode {
  const [draft, setDraft] = useState(String(value));

  async function commit(): Promise<void> {
    const parsed = Number(draft.trim());

    if (!Number.isInteger(parsed) || parsed <= 0) {
      setDraft(String(value));
      return;
    }

    if (parsed === value) {
      setDraft(String(value));
      return;
    }

    const ok = await onCommitValue(parsed);
    setDraft(ok ? String(parsed) : String(value));
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={`truncate text-[13px] ${
          isUnknown ? 'italic text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'
        }`}
      >
        {label}
      </span>

      <div className="flex flex-shrink-0 items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            }
            if (e.key === 'Escape') {
              e.preventDefault();
              setDraft(String(value));
              e.currentTarget.blur();
            }
          }}
          className="
            h-8 w-16 rounded-[6px] border-[0.5px] border-[var(--color-border)]
            bg-[var(--color-bg-surface)] px-2 text-right text-[13px] text-[var(--color-text-primary)]
            outline-none transition-all duration-150
            focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
          "
        />
        <span className="text-[12px] text-[var(--color-text-tertiary)]">мин</span>

        {isPendingDelete ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="text-[12px] font-medium text-[#DC2626] hover:underline"
              onClick={onDeleteConfirm}
            >
              Да
            </button>
            <button
              type="button"
              className="text-[12px] text-[var(--color-text-secondary)] hover:underline"
              onClick={onDeleteCancel}
            >
              Нет
            </button>
          </div>
        ) : (
          <IconButton
            size="sm"
            aria-label={`Удалить переопределение «${label}»`}
            onClick={onDeleteRequest}
            icon={<Icon icon="tabler:trash" className="h-4 w-4" />}
          />
        )}
      </div>
    </div>
  );
}

interface ResolvedEntry {
  key: string;
  label: string;
  isUnknown: boolean;
  value: number;
}

interface OverrideSectionProps {
  map: OverrideMap;
  title: string;
  initialEntries: Record<string, number>;
  resolveLabel: (key: string) => { label: string; isUnknown: boolean };
  keyPicker: (props: KeyPickerProps) => ReactNode;
  hasAvailableKeys: (usedKeys: string[]) => boolean;
}

function OverrideSection({
  map,
  title,
  initialEntries,
  resolveLabel,
  keyPicker,
  hasAvailableKeys,
}: OverrideSectionProps): ReactNode {
  const [entries, setEntries] = useState<Record<string, number>>(initialEntries);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const resolved: ResolvedEntry[] = Object.entries(entries).map(([key, value]) => {
    const { label, isUnknown } = resolveLabel(key);
    return { key, label, isUnknown, value };
  });

  const usedKeys = Object.keys(entries);

  function cancelAdd(): void {
    setIsAdding(false);
    setNewKey('');
    setNewValue('');
  }

  async function handleAddSubmit(): Promise<void> {
    const key = newKey.trim();
    const parsed = Number(newValue.trim());

    if (!key || !Number.isInteger(parsed) || parsed <= 0) {
      return;
    }

    setSubmitting(true);
    const ok = await patchOverride(map, key, parsed);
    setSubmitting(false);

    if (ok) {
      setEntries((prev) => ({ ...prev, [key]: parsed }));
      cancelAdd();
    } else {
      setToast('Не удалось добавить переопределение');
    }
  }

  async function handleValueCommit(key: string, next: number): Promise<boolean> {
    const ok = await patchOverride(map, key, next);
    if (ok) {
      setEntries((prev) => ({ ...prev, [key]: next }));
    }
    return ok;
  }

  async function handleRemove(key: string): Promise<void> {
    setPendingDeleteKey(null);
    const snapshot = entries;
    setEntries((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    const ok = await patchOverride(map, key, null);
    if (!ok) {
      setEntries(snapshot);
      setToast('Не удалось удалить переопределение');
    }
  }

  return (
    <div className="border-b-[0.5px] border-[var(--color-border)] px-5 py-4 last:border-0">
      <h3 className="mb-2 text-[13px] font-medium text-[var(--color-text-secondary)]">{title}</h3>

      {resolved.length === 0 && !isAdding && (
        <p className="text-[13px] text-[var(--color-text-tertiary)]">
          Переопределений нет — действует норматив по умолчанию
        </p>
      )}

      {resolved.length > 0 && (
        <div className="flex flex-col gap-2">
          {resolved.map((entry) => (
            <OverrideRow
              key={entry.key}
              label={entry.label}
              isUnknown={entry.isUnknown}
              value={entry.value}
              isPendingDelete={pendingDeleteKey === entry.key}
              onCommitValue={(next) => handleValueCommit(entry.key, next)}
              onDeleteRequest={() => setPendingDeleteKey(entry.key)}
              onDeleteCancel={() => setPendingDeleteKey(null)}
              onDeleteConfirm={() => handleRemove(entry.key)}
            />
          ))}
        </div>
      )}

      <div className="mt-3">
        {isAdding ? (
          <div className="flex items-center gap-2">
            {keyPicker({ value: newKey, onChange: setNewKey, excludeKeys: usedKeys })}
            <input
              type="text"
              inputMode="numeric"
              placeholder="мин"
              disabled={submitting}
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleAddSubmit();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  cancelAdd();
                }
              }}
              className="
                h-8 w-16 flex-shrink-0 rounded-[6px] border-[0.5px] border-[var(--color-border)]
                bg-[var(--color-bg-surface)] px-2 text-right text-[13px] text-[var(--color-text-primary)]
                outline-none transition-all duration-150
                focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
                disabled:cursor-not-allowed disabled:opacity-50
              "
            />
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={submitting}
              onClick={handleAddSubmit}
            >
              Добавить
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={submitting} onClick={cancelAdd}>
              Отмена
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!hasAvailableKeys(usedKeys)}
            className="text-[var(--color-text-secondary)]"
            onClick={() => setIsAdding(true)}
          >
            ＋ Добавить переопределение
          </Button>
        )}
      </div>

      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

export interface ReactionNormOverridesTableProps {
  initialBySource: Record<string, number>;
  initialByStage: Record<string, number>;
  initialByUser: Record<string, number>;
  stages: StageOption[];
  users: UserOption[];
  knownSources: string[];
}

export default function ReactionNormOverridesTable({
  initialBySource,
  initialByStage,
  initialByUser,
  stages,
  users,
  knownSources,
}: ReactionNormOverridesTableProps): ReactNode {
  const stageById = new Map(stages.map((stage) => [stage.id, stage.name]));
  const userById = new Map(users.map((user) => [user.id, user.name]));
  const activeUsers = users.filter((user) => !user.isBlocked);

  return (
    <SettingsCard icon="tabler:adjustments" title="Переопределения нормативов">
      <datalist id={KNOWN_SOURCES_LIST_ID}>
        <option value={OTHER_BYSOURCE_KEY} label={OTHER_SOURCE_LABEL} />
        {knownSources.map((source) => (
          <option key={source} value={source} />
        ))}
      </datalist>

      <OverrideSection
        map="bySource"
        title="По источнику"
        initialEntries={initialBySource}
        resolveLabel={(key) =>
          key === OTHER_BYSOURCE_KEY
            ? { label: OTHER_SOURCE_LABEL, isUnknown: false }
            : { label: key, isUnknown: false }
        }
        keyPicker={renderSourceKeyPicker}
        hasAvailableKeys={() => true}
      />

      <OverrideSection
        map="byStage"
        title="По этапу"
        initialEntries={initialByStage}
        resolveLabel={(key) => {
          const name = stageById.get(key);
          return name ? { label: name, isUnknown: false } : { label: `Этап удалён (${key})`, isUnknown: true };
        }}
        keyPicker={makeIdKeyPicker(stages, 'Выберите этап')}
        hasAvailableKeys={(used) => stages.some((stage) => !used.includes(stage.id))}
      />

      <OverrideSection
        map="byUser"
        title="По сотруднику"
        initialEntries={initialByUser}
        resolveLabel={(key) => {
          const name = userById.get(key);
          return name ? { label: name, isUnknown: false } : { label: `Сотрудник недоступен (${key})`, isUnknown: true };
        }}
        keyPicker={makeIdKeyPicker(activeUsers, 'Выберите сотрудника')}
        hasAvailableKeys={(used) => activeUsers.some((user) => !used.includes(user.id))}
      />
    </SettingsCard>
  );
}
