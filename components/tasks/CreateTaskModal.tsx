'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from '@iconify/react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PrioritySegment, { type TaskPriority } from '@/components/tasks/PrioritySegment';

interface CreateTaskModalProps {
  onClose: () => void;
  onCreate: (data: {
    title: string;
    leadId: string;
    assignee: string;
    date: string;
    time: string;
    priority: TaskPriority;
  }) => void;
}

const LEAD_OPTIONS = [
  { value: '', label: 'Выберите лид' },
  { value: '1', label: 'Иван Петров' },
  { value: '2', label: 'ООО Вектор' },
  { value: '3', label: 'ЗАО Альянс' },
];

const ASSIGNEE_OPTIONS = [
  { value: 'alexey', label: 'Алексей Д.' },
  { value: 'maria', label: 'Мария С.' },
  { value: 'ivan', label: 'Иван К.' },
];

const selectClass = `
  h-[36px] w-full appearance-none rounded-[6px]
  border border-[var(--color-border)] border-[0.5px]
  bg-[var(--color-bg-surface)] px-3 pr-8
  text-[14px] text-[var(--color-text-primary)]
  outline-none transition-all duration-150
  focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
`;

interface ModalSelectProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function ModalSelect({ label, id, value, onChange, options }: ModalSelectProps): ReactNode {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[12px] text-[var(--color-text-secondary)]"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={selectClass}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Icon
          icon="tabler:chevron-down"
          className="
            pointer-events-none absolute right-3 top-1/2 h-4 w-4
            -translate-y-1/2 text-[var(--color-text-tertiary)]
          "
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export default function CreateTaskModal({ onClose, onCreate }: CreateTaskModalProps): ReactNode {
  const [title, setTitle] = useState('');
  const [leadId, setLeadId] = useState('');
  const [assignee, setAssignee] = useState('alexey');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');

  const isValid = title.trim().length > 0;

  function handleCreate(): void {
    if (!isValid) return;

    // TODO: POST /api/tasks
    onCreate({
      title: title.trim(),
      leadId,
      assignee,
      date,
      time,
      priority,
    });
    onClose();
  }

  return (
    <Modal
      onClose={onClose}
      dialogClassName="w-[480px] max-w-[480px] rounded-[12px] p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-medium text-[var(--color-text-primary)]">
          Новая задача
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="
            rounded-[6px] p-1 text-[var(--color-text-tertiary)]
            transition-colors duration-150 hover:text-[var(--color-text-primary)]
          "
          aria-label="Закрыть"
        >
          ✕
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="task-title"
            className="text-[12px] text-[var(--color-text-secondary)]"
          >
            Задача <span className="text-[#EF4444]">*</span>
          </label>
          <textarea
            id="task-title"
            rows={3}
            placeholder="Что нужно сделать?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="
              w-full resize-none rounded-[6px]
              border border-[var(--color-border)] border-[0.5px] p-3
              text-[14px] text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-tertiary)]
              outline-none transition-all duration-150
              focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
            "
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <ModalSelect
              label="Лид"
              id="task-lead"
              value={leadId}
              onChange={setLeadId}
              options={LEAD_OPTIONS}
            />
          </div>
          <div className="flex-1">
            <ModalSelect
              label="Исполнитель"
              id="task-assignee"
              value={assignee}
              onChange={setAssignee}
              options={ASSIGNEE_OPTIONS}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-[var(--color-text-secondary)]">Срок</span>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="date"
                placeholder="Дата"
                icon={<Icon icon="tabler:calendar" className="h-4 w-4" />}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Дата"
              />
            </div>
            <div className="flex-1">
              <Input
                type="time"
                placeholder="Время"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                aria-label="Время"
              />
            </div>
          </div>
        </div>

        <PrioritySegment value={priority} onChange={setPriority} />
      </div>

      <div
        className="
          mt-6 flex justify-end gap-3
          border-t border-[var(--color-border)] border-[0.5px] pt-4
        "
      >
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button variant="primary" disabled={!isValid} onClick={handleCreate}>
          Создать
        </Button>
      </div>
    </Modal>
  );
}
