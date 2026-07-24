'use client';

import { useCallback, useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import Button from '@/components/ui/Button';
import IconButton from '@/components/ui/IconButton';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Toast from '@/components/ui/Toast';
import Toggle from '@/components/settings/Toggle';
import {
  createAssignmentRuleSchema,
  updateAssignmentRuleSchema,
} from '@/lib/validations/assign';

export interface AssignmentRuleItem {
  id: string;
  matchSource: string | null;
  matchSourceLabel: string | null;
  priority: number;
  isActive: boolean;
  assignTo: { id: string; name: string };
  fallbackTo: { id: string; name: string } | null;
}

export interface AssignmentRuleUser {
  id: string;
  name: string;
  isBlocked: boolean;
}

const NONE_FALLBACK = '__none__';

const fieldErrorMessages: Record<string, string> = {
  matchSource: 'Некорректное значение',
  matchSourceLabel: 'Некорректное значение',
  assignToId: 'Выберите исполнителя',
  fallbackToId: 'Некорректный запасной исполнитель',
  priority: 'Введите целое число',
};

// Заблокированные не должны выбираться заново, но уже назначенный
// исполнитель/запасной должен остаться виден в списке при редактировании.
function buildUserOptions(users: AssignmentRuleUser[], keepId?: string) {
  return users
    .filter((user) => !user.isBlocked || user.id === keepId)
    .map((user) => ({
      value: user.id,
      label: user.isBlocked ? `${user.name} (заблокирован)` : user.name,
    }));
}

interface AssignmentRuleModalProps {
  rule: AssignmentRuleItem | null;
  users: AssignmentRuleUser[];
  onClose: () => void;
  onSuccess: (rule: AssignmentRuleItem) => void;
}

function AssignmentRuleModal({ rule, users, onClose, onSuccess }: AssignmentRuleModalProps): ReactNode {
  const isEdit = rule !== null;
  const [matchSource, setMatchSource] = useState(rule?.matchSource ?? '');
  const [matchSourceLabel, setMatchSourceLabel] = useState(rule?.matchSourceLabel ?? '');
  const [assignToId, setAssignToId] = useState(rule?.assignTo.id ?? '');
  const [fallbackToId, setFallbackToId] = useState(rule?.fallbackTo?.id ?? NONE_FALLBACK);
  const [priority, setPriority] = useState(rule ? String(rule.priority) : '0');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const assignToOptions = buildUserOptions(users, rule?.assignTo.id);
  const fallbackOptions = [
    { value: NONE_FALLBACK, label: 'Нет' },
    ...buildUserOptions(users, rule?.fallbackTo?.id),
  ];

  function applyFieldErrors(issues: ReadonlyArray<{ path: (string | number)[] }>): void {
    const errs: Record<string, string> = {};
    for (const issue of issues) {
      const field = String(issue.path[0]);
      if (!errs[field]) errs[field] = fieldErrorMessages[field] ?? 'Некорректное значение';
    }
    setFieldErrors(errs);
  }

  async function applyServerError(res: Response): Promise<void> {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (data.error === 'WRONG_COMPANY') {
      setFormError('Выбранный пользователь не найден в компании');
    } else if (data.error === 'VALIDATION_ERROR') {
      setFormError('Некорректные данные. Проверьте форму');
    } else {
      setFormError('Произошла ошибка. Попробуйте ещё раз');
    }
  }

  async function handleSubmit(): Promise<void> {
    setFieldErrors({});
    setFormError(null);

    const normalizedMatchSource = matchSource.trim() === '' ? null : matchSource.trim();
    const normalizedMatchSourceLabel =
      matchSourceLabel.trim() === '' ? null : matchSourceLabel.trim();
    const normalizedFallbackToId = fallbackToId === NONE_FALLBACK ? null : fallbackToId;
    const normalizedPriority = Number(priority);

    if (!isEdit) {
      const parsed = createAssignmentRuleSchema.safeParse({
        matchSource: normalizedMatchSource,
        matchSourceLabel: normalizedMatchSourceLabel,
        assignToId,
        fallbackToId: normalizedFallbackToId,
        priority: normalizedPriority,
        isActive: true,
      });

      if (!parsed.success) {
        applyFieldErrors(parsed.error.issues);
        return;
      }

      setLoading(true);
      try {
        const res = await fetch('/api/assignment-rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed.data),
        });

        if (res.ok) {
          onSuccess((await res.json()) as AssignmentRuleItem);
          return;
        }

        await applyServerError(res);
      } catch {
        setFormError('Произошла ошибка. Попробуйте ещё раз');
      } finally {
        setLoading(false);
      }
      return;
    }

    const diff: Record<string, unknown> = {};
    if (normalizedMatchSource !== rule.matchSource) diff.matchSource = normalizedMatchSource;
    if (normalizedMatchSourceLabel !== rule.matchSourceLabel) {
      diff.matchSourceLabel = normalizedMatchSourceLabel;
    }
    if (assignToId !== rule.assignTo.id) diff.assignToId = assignToId;
    if (normalizedFallbackToId !== (rule.fallbackTo?.id ?? null)) {
      diff.fallbackToId = normalizedFallbackToId;
    }
    if (normalizedPriority !== rule.priority) diff.priority = normalizedPriority;

    if (Object.keys(diff).length === 0) {
      onClose();
      return;
    }

    const parsed = updateAssignmentRuleSchema.safeParse(diff);
    if (!parsed.success) {
      applyFieldErrors(parsed.error.issues);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/assignment-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });

      if (res.ok) {
        onSuccess((await res.json()) as AssignmentRuleItem);
        return;
      }

      await applyServerError(res);
    } catch {
      setFormError('Произошла ошибка. Попробуйте ещё раз');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal onClose={onClose} dialogClassName="max-w-[440px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-medium text-[var(--color-text-primary)]">
          {isEdit ? 'Редактирование правила' : 'Новое правило'}
        </h2>
        <IconButton
          size="sm"
          onClick={onClose}
          aria-label="Закрыть"
          icon={<span aria-hidden="true">✕</span>}
        />
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <Input
          label="Источник (source)"
          placeholder="Например: yandex — пусто для любого"
          value={matchSource}
          onChange={(e) => setMatchSource(e.target.value)}
          error={fieldErrors.matchSource}
        />

        <Input
          label="Метка формы (sourceLabel)"
          placeholder="Например: landing-vip — пусто для любой"
          value={matchSourceLabel}
          onChange={(e) => setMatchSourceLabel(e.target.value)}
          error={fieldErrors.matchSourceLabel}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]">
            Исполнитель
          </span>
          <Select
            value={assignToId}
            onChange={setAssignToId}
            options={assignToOptions}
            placeholder="Выберите исполнителя"
          />
          {fieldErrors.assignToId && (
            <span className="text-[12px] text-[#EF4444]">{fieldErrors.assignToId}</span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]">
            Запасной исполнитель
          </span>
          <Select value={fallbackToId} onChange={setFallbackToId} options={fallbackOptions} />
          {fieldErrors.fallbackToId && (
            <span className="text-[12px] text-[#EF4444]">{fieldErrors.fallbackToId}</span>
          )}
        </div>

        <Input
          label="Приоритет"
          type="number"
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          error={fieldErrors.priority}
        />

        {formError && <p className="text-[13px] text-[#EF4444]">{formError}</p>}

        <div className="mt-2 flex justify-end gap-3">
          <Button variant="secondary" size="md" type="button" onClick={onClose} disabled={loading}>
            Отмена
          </Button>
          <Button
            variant="primary"
            size="md"
            type="button"
            disabled={loading}
            onClick={handleSubmit}
          >
            {loading ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

interface AssignmentRulesListProps {
  initialRules: AssignmentRuleItem[];
  users: AssignmentRuleUser[];
}

function sortByPriority(rules: AssignmentRuleItem[]): AssignmentRuleItem[] {
  return [...rules].sort((a, b) => a.priority - b.priority);
}

const TABLE_COLUMNS = [
  'ИСТОЧНИК',
  'МЕТКА',
  'ИСПОЛНИТЕЛЬ',
  'ЗАПАСНОЙ',
  'ПРИОРИТЕТ',
  'АКТИВНО',
  'ДЕЙСТВИЯ',
] as const;

export default function AssignmentRulesList({ initialRules, users }: AssignmentRulesListProps): ReactNode {
  const [rules, setRules] = useState<AssignmentRuleItem[]>(() => sortByPriority(initialRules));
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editRule, setEditRule] = useState<AssignmentRuleItem | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((title: string) => setToast(title), []);

  function handleAddSuccess(created: AssignmentRuleItem): void {
    setRules((prev) => sortByPriority([...prev, created]));
    setIsAddOpen(false);
    showToast('Правило создано');
  }

  function handleEditSuccess(updated: AssignmentRuleItem): void {
    setRules((prev) => sortByPriority(prev.map((r) => (r.id === updated.id ? updated : r))));
    setEditRule(null);
    showToast('Правило обновлено');
  }

  async function handleToggleActive(rule: AssignmentRuleItem): Promise<void> {
    const snapshot = rules;
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, isActive: !r.isActive } : r)));

    try {
      const res = await fetch(`/api/assignment-rules/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !rule.isActive }),
      });

      if (!res.ok) {
        setRules(snapshot);
        showToast('Не удалось изменить активность правила');
      }
    } catch {
      setRules(snapshot);
      showToast('Не удалось изменить активность правила');
    }
  }

  function handleDeleteRequest(id: string): void {
    setPendingDeleteId(id);
  }

  function handleDeleteCancel(): void {
    setPendingDeleteId(null);
  }

  async function handleDeleteConfirm(id: string): Promise<void> {
    const snapshot = rules;
    setPendingDeleteId(null);
    setRules((prev) => prev.filter((r) => r.id !== id));

    try {
      const res = await fetch(`/api/assignment-rules/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        setRules(snapshot);
        showToast('Не удалось удалить правило');
      } else {
        showToast('Правило удалено');
      }
    } catch {
      setRules(snapshot);
      showToast('Не удалось удалить правило');
    }
  }

  return (
    <>
      {/* Десктоп (≥ lg): таблица */}
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b-[0.5px] border-[var(--color-border)]">
              {TABLE_COLUMNS.map((column) => (
                <th
                  key={column}
                  className="px-4 py-2.5 text-left text-[11px] font-medium tracking-[0.05em] text-[var(--color-text-secondary)] uppercase"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td
                  colSpan={TABLE_COLUMNS.length}
                  className="px-4 py-6 text-center text-[13px] text-[var(--color-text-secondary)]"
                >
                  Правила не настроены — назначение работает по режиму компании
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id} className="border-b-[0.5px] border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-3 text-[13px] text-[var(--color-text-primary)]">
                    {rule.matchSource ?? (
                      <span className="text-[var(--color-text-tertiary)]">Любой</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--color-text-primary)]">
                    {rule.matchSourceLabel ?? (
                      <span className="text-[var(--color-text-tertiary)]">Любая</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--color-text-primary)]">
                    {rule.assignTo.name}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
                    {rule.fallbackTo?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-[13px] text-[var(--color-text-secondary)]">
                    {rule.priority}
                  </td>
                  <td className="px-4 py-3">
                    <Toggle
                      checked={rule.isActive}
                      onChange={() => handleToggleActive(rule)}
                      aria-label={`Активность правила: ${rule.matchSource ?? rule.matchSourceLabel ?? rule.id}`}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {pendingDeleteId === rule.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-[var(--color-text-secondary)]">Удалить?</span>
                        <button
                          type="button"
                          className="text-[12px] font-medium text-[#DC2626] hover:underline"
                          onClick={() => handleDeleteConfirm(rule.id)}
                        >
                          Да
                        </button>
                        <button
                          type="button"
                          className="text-[12px] text-[var(--color-text-secondary)] hover:underline"
                          onClick={handleDeleteCancel}
                        >
                          Нет
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <IconButton
                          size="sm"
                          onClick={() => setEditRule(rule)}
                          aria-label={`Редактировать правило ${rule.id}`}
                          icon={<Icon icon="tabler:edit" className="h-4 w-4" />}
                        />
                        <IconButton
                          size="sm"
                          onClick={() => handleDeleteRequest(rule.id)}
                          aria-label={`Удалить правило ${rule.id}`}
                          icon={<Icon icon="tabler:trash" className="h-4 w-4" />}
                        />
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Мобильные/планшет (< lg): карточки вместо таблицы с прокруткой */}
      {rules.length === 0 ? (
        <p className="px-5 py-6 text-center text-[13px] text-[var(--color-text-secondary)] lg:hidden">
          Правила не настроены — назначение работает по режиму компании
        </p>
      ) : (
        <div className="flex flex-col gap-3 p-4 lg:hidden">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[var(--color-text-primary)]">
                    {rule.assignTo.name}
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--color-text-secondary)]">
                    Приоритет {rule.priority}
                  </p>
                </div>
                <Toggle
                  checked={rule.isActive}
                  onChange={() => handleToggleActive(rule)}
                  aria-label={`Активность правила: ${rule.matchSource ?? rule.matchSourceLabel ?? rule.id}`}
                />
              </div>

              <dl className="mt-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[12px] text-[var(--color-text-secondary)]">Источник</dt>
                  <dd className="text-[13px] text-[var(--color-text-primary)]">
                    {rule.matchSource ?? (
                      <span className="text-[var(--color-text-tertiary)]">Любой</span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[12px] text-[var(--color-text-secondary)]">Метка</dt>
                  <dd className="text-[13px] text-[var(--color-text-primary)]">
                    {rule.matchSourceLabel ?? (
                      <span className="text-[var(--color-text-tertiary)]">Любая</span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-[12px] text-[var(--color-text-secondary)]">Запасной</dt>
                  <dd className="text-[13px] text-[var(--color-text-primary)]">
                    {rule.fallbackTo?.name ?? '—'}
                  </dd>
                </div>
              </dl>

              <div className="mt-3 flex items-center gap-2 border-t-[0.5px] border-[var(--color-border)] pt-3">
                {pendingDeleteId === rule.id ? (
                  <>
                    <span className="mr-auto text-[12px] text-[var(--color-text-secondary)]">
                      Удалить правило?
                    </span>
                    <button
                      type="button"
                      className="text-[12px] font-medium text-[#DC2626] hover:underline"
                      onClick={() => handleDeleteConfirm(rule.id)}
                    >
                      Да
                    </button>
                    <button
                      type="button"
                      className="text-[12px] text-[var(--color-text-secondary)] hover:underline"
                      onClick={handleDeleteCancel}
                    >
                      Нет
                    </button>
                  </>
                ) : (
                  <div className="ml-auto flex items-center gap-2">
                    <IconButton
                      size="sm"
                      onClick={() => setEditRule(rule)}
                      aria-label={`Редактировать правило ${rule.id}`}
                      icon={<Icon icon="tabler:edit" className="h-4 w-4" />}
                    />
                    <IconButton
                      size="sm"
                      onClick={() => handleDeleteRequest(rule.id)}
                      aria-label={`Удалить правило ${rule.id}`}
                      icon={<Icon icon="tabler:trash" className="h-4 w-4" />}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-[var(--color-text-secondary)]"
          onClick={() => setIsAddOpen(true)}
        >
          ＋ Добавить правило
        </Button>
      </div>

      {isAddOpen && (
        <AssignmentRuleModal
          rule={null}
          users={users}
          onClose={() => setIsAddOpen(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {editRule && (
        <AssignmentRuleModal
          rule={editRule}
          users={users}
          onClose={() => setEditRule(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {toast && <Toast title={toast} onClose={() => setToast(null)} />}
    </>
  );
}
