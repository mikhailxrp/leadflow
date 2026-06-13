"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import IconButton from "@/components/ui/IconButton";
import { ASSIGNEE_OPTIONS } from "@/components/tasks/taskConstants";

export interface CreateTaskPayload {
  title: string;
  assignedToId: string;
  dueDate: string;
  dueTime: string;
  description: string;
}

interface AddTaskModalProps {
  leadId: string;
  onClose: () => void;
  onCreate: (data: CreateTaskPayload) => void;
}

const selectClass = `
  h-[36px] w-full appearance-none rounded-[6px]
  border border-[var(--color-border)] border-[0.5px]
  bg-[var(--color-bg-surface)] px-3 pr-8
  text-[14px] text-[var(--color-text-primary)]
  outline-none transition-all duration-150
  focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
`;

interface ModalSelectProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function ModalSelect({
  label,
  id,
  value,
  onChange,
  options,
}: ModalSelectProps): ReactNode {
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

export default function AddTaskModal({
  leadId,
  onClose,
  onCreate,
}: AddTaskModalProps): ReactNode {
  const [title, setTitle] = useState("");
  const [assignedToId, setAssignedToId] = useState("alexey");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [description, setDescription] = useState("");

  const isValid = title.trim().length > 0;

  function handleCreate(): void {
    if (!isValid) return;

    // TODO: POST /api/leads/[leadId]/tasks
    onCreate({
      title: title.trim(),
      assignedToId,
      dueDate,
      dueTime,
      description: description.trim(),
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
        <IconButton
          size="sm"
          onClick={onClose}
          aria-label="Закрыть"
          icon={<span aria-hidden="true">✕</span>}
        />
      </div>

      <input type="hidden" name="leadId" value={leadId} />

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="add-task-title"
            className="text-[12px] text-[var(--color-text-secondary)]"
          >
            Задача <span className="text-[#EF4444]">*</span>
          </label>
          <textarea
            id="add-task-title"
            rows={2}
            placeholder="Что нужно сделать?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="
              w-full resize-none rounded-[6px]
              border border-[var(--color-border)] border-[0.5px] p-3
              text-[14px] text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-tertiary)]
              outline-none transition-all duration-150
              focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
            "
          />
        </div>

        <ModalSelect
          label="Исполнитель"
          id="add-task-assignee"
          value={assignedToId}
          onChange={setAssignedToId}
          options={[...ASSIGNEE_OPTIONS]}
        />

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-[var(--color-text-secondary)]">
            Срок
          </span>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="date"
                placeholder="Дата"
                icon={<Icon icon="tabler:calendar" className="h-4 w-4" />}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-label="Дата"
              />
            </div>
            <div className="flex-1">
              <Input
                type="time"
                placeholder="Время"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                aria-label="Время"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="add-task-description"
            className="text-[12px] text-[var(--color-text-secondary)]"
          >
            Описание
          </label>
          <textarea
            id="add-task-description"
            rows={2}
            placeholder="Дополнительные детали..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="
              w-full resize-none rounded-[6px]
              border border-[var(--color-border)] border-[0.5px] p-3
              text-[14px] text-[var(--color-text-primary)]
              placeholder:text-[var(--color-text-tertiary)]
              outline-none transition-all duration-150
              focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
            "
          />
        </div>
      </div>

      <div
        className="
          mt-6 flex justify-end gap-3 pt-4
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
