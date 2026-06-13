"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import IconButton from "@/components/ui/IconButton";
import TaskStatusBadge, {
  type TaskStatus,
} from "@/components/tasks/TaskStatusBadge";
import {
  ASSIGNEE_OPTIONS,
  isTaskEditable,
} from "@/components/tasks/taskConstants";
import { type TaskData } from "@/components/tasks/TaskItem";

export interface UpdateTaskPayload {
  id: string;
  title: string;
  assignedToId: string;
  dueDate: string;
  dueTime: string;
  description: string;
  status: TaskStatus;
}

interface EditTaskModalProps {
  task: TaskData;
  onClose: () => void;
  onSave: (data: UpdateTaskPayload) => void;
  onCancelTask: (id: string) => void;
}

const selectClass = `
  h-[36px] w-full appearance-none rounded-[6px]
  border border-[var(--color-border)] border-[0.5px]
  bg-[var(--color-bg-surface)] px-3 pr-8
  text-[14px] text-[var(--color-text-primary)]
  outline-none transition-all duration-150
  focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
  disabled:cursor-not-allowed disabled:opacity-60
`;

const textareaClass = `
  w-full resize-none rounded-[6px]
  border border-[var(--color-border)] border-[0.5px] p-3
  text-[14px] text-[var(--color-text-primary)]
  placeholder:text-[var(--color-text-tertiary)]
  outline-none transition-all duration-150
  focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
  disabled:cursor-not-allowed disabled:opacity-60
`;

interface ModalSelectProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}

function ModalSelect({
  label,
  id,
  value,
  onChange,
  options,
  disabled = false,
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
          disabled={disabled}
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

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "TODO", label: "Новая" },
  { value: "IN_PROGRESS", label: "В работе" },
];

export default function EditTaskModal({
  task,
  onClose,
  onSave,
  onCancelTask,
}: EditTaskModalProps): ReactNode {
  const editable = isTaskEditable(task.status);

  const [title, setTitle] = useState(task.title);
  const [assignedToId, setAssignedToId] = useState(task.assigneeId);
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [dueTime, setDueTime] = useState(task.dueTime ?? "");
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(
    task.status === "IN_PROGRESS" ? "IN_PROGRESS" : "TODO",
  );

  const isValid = title.trim().length > 0;

  function handleSave(): void {
    if (!isValid || !editable) return;

    // TODO: PATCH /api/leads/:leadId/tasks/:taskId
    onSave({
      id: task.id,
      title: title.trim(),
      assignedToId,
      dueDate,
      dueTime,
      description: description.trim(),
      status,
    });
    onClose();
  }

  function handleCancelTask(): void {
    if (!editable) return;

    // TODO: PATCH /api/leads/:leadId/tasks/:taskId { status: 'CANCELLED' }
    onCancelTask(task.id);
    onClose();
  }

  return (
    <Modal
      onClose={onClose}
      dialogClassName="w-[480px] max-w-[480px] rounded-[12px] p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[20px] font-medium text-[var(--color-text-primary)]">
          {editable ? "Редактировать задачу" : "Задача"}
        </h2>
        <div className="flex items-center gap-2">
          <TaskStatusBadge status={task.status} />
          <IconButton
            size="sm"
            onClick={onClose}
            aria-label="Закрыть"
            icon={<span aria-hidden="true">✕</span>}
          />
        </div>
      </div>

      {!editable && (
        <p className="mt-3 text-[13px] text-[var(--color-text-secondary)]">
          Выполненные и отменённые задачи нельзя редактировать.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="edit-task-title"
            className="text-[12px] text-[var(--color-text-secondary)]"
          >
            Задача <span className="text-[#EF4444]">*</span>
          </label>
          <textarea
            id="edit-task-title"
            rows={2}
            value={title}
            disabled={!editable}
            onChange={(e) => setTitle(e.target.value)}
            className={textareaClass}
          />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <ModalSelect
              label="Исполнитель"
              id="edit-task-assignee"
              value={assignedToId}
              disabled={!editable}
              onChange={setAssignedToId}
              options={[...ASSIGNEE_OPTIONS]}
            />
          </div>
          {editable && (
            <div className="flex-1">
              <ModalSelect
                label="Статус"
                id="edit-task-status"
                value={status}
                onChange={(value) => setStatus(value as TaskStatus)}
                options={STATUS_OPTIONS}
              />
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[12px] text-[var(--color-text-secondary)]">
            Срок
          </span>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="date"
                disabled={!editable}
                icon={<Icon icon="tabler:calendar" className="h-4 w-4" />}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-label="Дата"
              />
            </div>
            <div className="flex-1">
              <Input
                type="time"
                disabled={!editable}
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                aria-label="Время"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="edit-task-description"
            className="text-[12px] text-[var(--color-text-secondary)]"
          >
            Описание
          </label>
          <textarea
            id="edit-task-description"
            rows={2}
            disabled={!editable}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={textareaClass}
          />
        </div>
      </div>

      <div
        className="
          mt-6 flex items-center justify-between gap-3 pt-4
        "
      >
        {editable ? (
          <Button variant="danger" size="sm" onClick={handleCancelTask}>
            Отменить задачу
          </Button>
        ) : (
          <span />
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            {editable ? "Закрыть" : "Закрыть"}
          </Button>
          {editable && (
            <Button variant="primary" disabled={!isValid} onClick={handleSave}>
              Сохранить
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
