'use client';

import { Icon } from '@iconify/react';
import Link from 'next/link';
import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import LeadPreviewCard from '@/components/leads/LeadPreviewCard';
import TagInput from '@/components/leads/TagInput';
import Toggle from '@/components/settings/Toggle';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

export type LeadPriority = 'low' | 'normal' | 'high';

export type LeadSource =
  | 'tilda'
  | 'wordpress'
  | 'yandex'
  | 'api'
  | 'call'
  | 'referral'
  | 'email'
  | 'other';

export interface CreateLeadFormState {
  name: string;
  phone: string;
  email: string;
  company: string;
  source: LeadSource;
  utmSource: string;
  utmMedium: string;
  utmTerm: string;
  utmContent: string;
  showExtendedUtm: boolean;
  comment: string;
  tags: string[];
  stageId: string;
  managerId: string;
  priority: LeadPriority;
  reminderEnabled: boolean;
  reminderDate: string;
  reminderTime: string;
  reminderText: string;
}

const SOURCE_OPTIONS: { value: LeadSource; label: string }[] = [
  { value: 'tilda', label: 'Tilda' },
  { value: 'wordpress', label: 'WordPress' },
  { value: 'yandex', label: 'Яндекс Директ' },
  { value: 'api', label: 'API·Webhook' },
  { value: 'call', label: 'Входящий звонок' },
  { value: 'referral', label: 'Рекомендация' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Другое' },
];

const MANAGER_OPTIONS = [
  { value: 'auto', label: 'Автоматически (Round-robin)' },
] as const;

const PRIORITY_OPTIONS: { value: LeadPriority; label: string }[] = [
  { value: 'low', label: 'Низкий' },
  { value: 'normal', label: 'Обычный' },
  { value: 'high', label: 'Высокий' },
];

const INITIAL_STATE: CreateLeadFormState = {
  name: '',
  phone: '',
  email: '',
  company: '',
  source: 'other',
  utmSource: '',
  utmMedium: '',
  utmTerm: '',
  utmContent: '',
  showExtendedUtm: false,
  comment: '',
  tags: [],
  stageId: '',
  managerId: 'auto',
  priority: 'normal',
  reminderEnabled: false,
  reminderDate: '',
  reminderTime: '10:00',
  reminderText: '',
};

const SELECT_CLASS = `
  h-[36px] w-full appearance-none rounded-[6px]
  border-[0.5px] border-[var(--color-border)]
  bg-[var(--color-bg-surface)] px-3 pr-8
  text-[13px] text-[var(--color-text-primary)]
  outline-none transition-all duration-150
  focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
`;

const TEXTAREA_CLASS = `
  w-full resize-none rounded-[6px] border-[0.5px] border-[var(--color-border)]
  bg-[var(--color-bg-surface)] p-3 text-[14px] text-[var(--color-text-primary)]
  placeholder:text-[var(--color-text-tertiary)]
  outline-none transition-all duration-150
  focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
`;

function mapSourceToBadge(source: LeadSource): 'tilda' | 'wordpress' | 'yandex' | 'api' | 'other' {
  if (source === 'tilda' || source === 'wordpress' || source === 'yandex' || source === 'api') {
    return source;
  }
  return 'other';
}

interface FormSectionProps {
  icon: string;
  title: string;
  children: ReactNode;
  headerAction?: ReactNode;
}

function FormSection({ icon, title, children, headerAction }: FormSectionProps) {
  return (
    <section className="overflow-hidden rounded-lg border-[0.5px] border-[var(--color-border)] bg-[var(--color-bg-surface)]">
      <div className="flex items-center justify-between border-b-[0.5px] border-[var(--color-border)] px-5 py-[14px]">
        <div className="flex items-center gap-2">
          <Icon
            icon={icon}
            className="h-4 w-4 shrink-0 text-[var(--color-text-secondary)]"
            aria-hidden="true"
          />
          <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">{title}</h2>
        </div>
        {headerAction}
      </div>
      {children}
    </section>
  );
}

interface FieldLabelProps {
  htmlFor: string;
  children: ReactNode;
  required?: boolean;
}

function FieldLabel({ htmlFor, children, required = false }: FieldLabelProps) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]"
    >
      {children}
      {required && <span className="text-[#EF4444]"> *</span>}
    </label>
  );
}

function ChevronIcon() {
  return (
    <Icon
      icon="tabler:chevron-down"
      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]"
      aria-hidden="true"
    />
  );
}

interface FormSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function FormSelect({ id, label, value, onChange, options }: FormSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={SELECT_CLASS}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronIcon />
      </div>
    </div>
  );
}

interface CollapsibleFieldsProps {
  open: boolean;
  children: ReactNode;
}

function CollapsibleFields({ open, children }: CollapsibleFieldsProps) {
  return (
    <div
      className={`
        grid transition-all duration-300 ease-in-out
        ${open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
      `}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

export default function CreateLeadForm() {
  const [state, setState] = useState<CreateLeadFormState>(INITIAL_STATE);

  const update = useCallback(<K extends keyof CreateLeadFormState>(
    key: K,
    value: CreateLeadFormState[K],
  ): void => {
    setState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const managerLabel = useMemo(
    () => MANAGER_OPTIONS.find((manager) => manager.value === state.managerId)?.label ?? '—',
    [state.managerId],
  );

  const isSubmitDisabled = state.name.trim().length === 0;

  function handleSubmit(): void {
    console.log('Create lead', state);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-5 p-6">
        <div className="flex items-start gap-5">
          {/* Левая колонка */}
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            <FormSection icon="tabler:user" title="Контактные данные">
              <div className="flex flex-col gap-4 px-5 py-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel htmlFor="lead-name" required>
                      Имя
                    </FieldLabel>
                    <Input
                      id="lead-name"
                      value={state.name}
                      onChange={(event) => update('name', event.target.value)}
                      placeholder="Введите имя"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <FieldLabel htmlFor="lead-phone">Телефон</FieldLabel>
                    <Input
                      id="lead-phone"
                      value={state.phone}
                      onChange={(event) => update('phone', event.target.value)}
                      placeholder="+7 (999) 000-00-00"
                      icon={
                        <Icon
                          icon="tabler:phone"
                          className="h-4 w-4 text-[var(--color-text-tertiary)]"
                          aria-hidden="true"
                        />
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel htmlFor="lead-email">Email</FieldLabel>
                    <Input
                      id="lead-email"
                      type="email"
                      value={state.email}
                      onChange={(event) => update('email', event.target.value)}
                      placeholder="email@example.com"
                      icon={
                        <Icon
                          icon="tabler:mail"
                          className="h-4 w-4 text-[var(--color-text-tertiary)]"
                          aria-hidden="true"
                        />
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <FieldLabel htmlFor="lead-company">Компания</FieldLabel>
                    <Input
                      id="lead-company"
                      value={state.company}
                      onChange={(event) => update('company', event.target.value)}
                      placeholder="Название компании"
                      icon={
                        <Icon
                          icon="tabler:building"
                          className="h-4 w-4 text-[var(--color-text-tertiary)]"
                          aria-hidden="true"
                        />
                      }
                    />
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection icon="tabler:chart-arrows" title="Источник лида">
              <div className="flex flex-col gap-4 px-5 py-4">
                <FormSelect
                  id="lead-source"
                  label="Источник"
                  value={state.source}
                  onChange={(value) => update('source', value as LeadSource)}
                  options={SOURCE_OPTIONS}
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel htmlFor="utm-source">UTM Source</FieldLabel>
                    <Input
                      id="utm-source"
                      value={state.utmSource}
                      onChange={(event) => update('utmSource', event.target.value)}
                      placeholder="google"
                      className="font-mono text-[13px]"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <FieldLabel htmlFor="utm-medium">UTM Medium</FieldLabel>
                    <Input
                      id="utm-medium"
                      value={state.utmMedium}
                      onChange={(event) => update('utmMedium', event.target.value)}
                      placeholder="cpc"
                      className="font-mono text-[13px]"
                    />
                  </div>
                </div>

                {!state.showExtendedUtm ? (
                  <button
                    type="button"
                    className="mt-0 cursor-pointer text-left text-[13px] text-[var(--color-primary)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
                    onClick={() => update('showExtendedUtm', true)}
                  >
                    ＋ Добавить UTM Term и Content
                  </button>
                ) : null}

                <CollapsibleFields open={state.showExtendedUtm}>
                  <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <FieldLabel htmlFor="utm-term">UTM Term</FieldLabel>
                      <Input
                        id="utm-term"
                        value={state.utmTerm}
                        onChange={(event) => update('utmTerm', event.target.value)}
                        placeholder="keyword"
                        className="font-mono text-[13px]"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <FieldLabel htmlFor="utm-content">UTM Content</FieldLabel>
                      <Input
                        id="utm-content"
                        value={state.utmContent}
                        onChange={(event) => update('utmContent', event.target.value)}
                        placeholder="banner_a"
                        className="font-mono text-[13px]"
                      />
                    </div>
                  </div>
                </CollapsibleFields>
              </div>
            </FormSection>

            <FormSection icon="tabler:list" title="Дополнительная информация">
              <div className="flex flex-col gap-4 px-5 py-4">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="lead-comment">Комментарий</FieldLabel>
                  <textarea
                    id="lead-comment"
                    rows={4}
                    value={state.comment}
                    onChange={(event) => update('comment', event.target.value)}
                    placeholder="Добавьте заметку о лиде..."
                    className={TEXTAREA_CLASS}
                  />
                </div>

                <TagInput
                  tags={state.tags}
                  onChange={(tags) => update('tags', tags)}
                />
              </div>
            </FormSection>
          </div>

          {/* Правая колонка */}
          <aside className="flex w-[300px] shrink-0 flex-col gap-5">
            <FormSection icon="tabler:settings" title="Параметры лида">
              <div className="flex flex-col gap-4 px-5 py-4">
                <div className="flex flex-col gap-1.5">
                  <FieldLabel htmlFor="lead-stage">Этап воронки</FieldLabel>
                  <div className="relative">
                    <select
                      id="lead-stage"
                      disabled
                      className="
                        h-[36px] w-full appearance-none rounded-[6px]
                        border-[0.5px] border-[var(--color-border)]
                        bg-[var(--color-bg-surface-2)] px-3 pr-8
                        text-[13px] text-[var(--color-text-tertiary)]
                        outline-none
                      "
                    >
                      <option value="">—</option>
                    </select>
                    <ChevronIcon />
                  </div>
                </div>

                <FormSelect
                  id="lead-manager"
                  label="Ответственный менеджер"
                  value={state.managerId}
                  onChange={(value) => update('managerId', value)}
                  options={MANAGER_OPTIONS.map(({ value, label }) => ({ value, label }))}
                />

                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-normal leading-5 text-[var(--color-text-secondary)]">
                    Приоритет
                  </span>
                  <div className="flex overflow-hidden rounded-[6px] border-[0.5px] border-[var(--color-border)]">
                    {PRIORITY_OPTIONS.map((option, index) => {
                      const isActive = state.priority === option.value;
                      const isLast = index === PRIORITY_OPTIONS.length - 1;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => update('priority', option.value)}
                          className={`
                            relative flex h-[36px] flex-1 items-center justify-center
                            text-[13px] transition-all duration-150
                            ${isLast ? '' : 'border-r-[0.5px] border-[var(--color-border)]'}
                            ${
                              isActive
                                ? 'z-[1] rounded-[6px] border-[0.5px] border-[var(--color-primary)] bg-[var(--color-bg-surface)] font-medium text-[var(--color-primary)]'
                                : 'bg-transparent text-[var(--color-text-secondary)]'
                            }
                          `}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection icon="tabler:clock" title="Напоминание">
              <div className="flex items-center justify-between px-5 py-[14px]">
                <span className="text-[14px] text-[var(--color-text-primary)]">
                  Создать напоминание
                </span>
                <Toggle
                  checked={state.reminderEnabled}
                  onChange={(checked) => update('reminderEnabled', checked)}
                  aria-label="Создать напоминание"
                />
              </div>

              <CollapsibleFields open={state.reminderEnabled}>
                <div className="flex flex-col gap-4 px-5 pb-4">
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel htmlFor="reminder-date">Дата</FieldLabel>
                    <Input
                      id="reminder-date"
                      type="date"
                      value={state.reminderDate}
                      onChange={(event) => update('reminderDate', event.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <FieldLabel htmlFor="reminder-time">Время</FieldLabel>
                    <Input
                      id="reminder-time"
                      type="time"
                      value={state.reminderTime}
                      onChange={(event) => update('reminderTime', event.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <FieldLabel htmlFor="reminder-text">Текст</FieldLabel>
                    <Input
                      id="reminder-text"
                      value={state.reminderText}
                      onChange={(event) => update('reminderText', event.target.value)}
                      placeholder="Перезвонить клиенту"
                    />
                  </div>
                </div>
              </CollapsibleFields>
            </FormSection>

            <FormSection icon="tabler:eye" title="Как будет выглядеть">
              <div className="px-4 py-3">
                <LeadPreviewCard
                  name={state.name.trim() || 'Новый лид'}
                  phone={state.phone.trim() || '+7 (999) 000-00-00'}
                  sourceBadge={mapSourceToBadge(state.source)}
                  status="new"
                  managerLabel={managerLabel}
                />
              </div>
            </FormSection>
          </aside>
        </div>
      </div>

      <footer
        className="
          sticky bottom-0 z-20 flex items-center justify-between
          border-t-[0.5px] border-[var(--color-border)]
          bg-[var(--color-bg-surface)] px-6 py-3
        "
      >
        <span className="text-[12px] text-[var(--color-text-tertiary)]">*Обязательные поля</span>

        <div className="flex items-center gap-3">
          <Link href="/leads">
            <Button type="button" variant="ghost" size="md">
              Отмена
            </Button>
          </Link>
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={isSubmitDisabled}
            className={isSubmitDisabled ? 'opacity-50' : ''}
            onClick={handleSubmit}
          >
            Создать лид
          </Button>
        </div>
      </footer>
    </div>
  );
}
