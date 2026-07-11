"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import IconButton from "@/components/ui/IconButton";
import TaskStatusBadge, {
  type TaskStatus,
} from "@/components/tasks/TaskStatusBadge";
import {
  isTaskEditable,
  toIsoFromLocalParts,
  toLocalDateTimeParts,
} from "@/components/tasks/taskConstants";
import { updateTaskSchema } from "@/lib/validations/tasks";
import { type TaskData } from "@/components/tasks/TaskItem";

interface AssignableUser {
  id: string;
  name: string;
}

interface EditTaskModalProps {
  task: TaskData;
  isAdmin: boolean;
  onClose: () => void;
  onUpdated: (task: TaskData) => void;
  onDeleted: (taskId: string) => void;
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
  isAdmin,
  onClose,
  onUpdated,
  onDeleted,
}: EditTaskModalProps): ReactNode {
  const editable = isTaskEditable(task.status);
  const initialParts = toLocalDateTimeParts(task.dueDate);

  const [assignees, setAssignees] = useState<AssignableUser[] | null>(null);
  const [assigneesError, setAssigneesError] = useState<string | null>(null);

  const [title, setTitle] = useState(task.title);
  const [assignedToId, setAssignedToId] = useState(task.assignedTo.id);
  const [date, setDate] = useState(initialParts.date);
  const [time, setTime] = useState(initialParts.time);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState<TaskStatus>(
    task.status === "IN_PROGRESS" ? "IN_PROGRESS" : "TODO",
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const res = await fetch("/api/users/assignable");
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as AssignableUser[];
        if (!cancelled) setAssignees(data);
      } catch {
        if (!cancelled) setAssigneesError("Не удалось загрузить исполнителей");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const isValid = title.trim().length > 0;

  async function patchTask(body: Record<string, unknown>): Promise<TaskData | null> {
    setFormError(null);

    try {
      const res = await fetch(`/api/leads/${task.leadId}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const errBody = (await res.json().catch(() => null)) as { error?: string } | null;
          setFormError(
            errBody?.error === "ASSIGNEE_INVALID"
              ? "Исполнитель недоступен — выберите другого"
              : errBody?.error === "TASK_NOT_EDITABLE"
                ? "Задача уже завершена или отменена — обновите страницу"
                : "Проверьте заполненные поля",
          );
        } else if (res.status === 403) {
          setFormError("Недостаточно прав для этого действия");
        } else {
          setFormError("Не удалось сохранить задачу");
        }
        return null;
      }

      return (await res.json()) as TaskData;
    } catch {
      setFormError("Ошибка сети");
      return null;
    }
  }

  async function handleSave(): Promise<void> {
    if (!isValid || !editable) return;

    const dueDate = toIsoFromLocalParts(date, time);
    const payload = {
      title: title.trim(),
      assignedToId,
      dueDate,
      description: description.trim() || undefined,
      status,
    };

    const parsed = updateTaskSchema.safeParse(payload);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Проверьте заполненные поля");
      return;
    }

    setSaving(true);
    try {
      const updated = await patchTask(parsed.data);
      if (!updated) return;
      onUpdated(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelTask(): Promise<void> {
    if (!editable) return;

    setSaving(true);
    try {
      const updated = await patchTask({ status: "CANCELLED" });
      if (!updated) return;
      onUpdated(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(): Promise<void> {
    if (!window.confirm("Удалить эту задачу без возможности восстановления?")) return;

    setDeleting(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/leads/${task.leadId}/tasks/${task.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        setFormError("Не удалось удалить задачу");
        return;
      }

      onDeleted(task.id);
      onClose();
    } catch {
      setFormError("Ошибка сети");
    } finally {
      setDeleting(false);
    }
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
            maxLength={200}
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
              disabled={!editable || assignees === null}
              onChange={setAssignedToId}
              options={
                assignees
                  ? assignees.map((user) => ({ value: user.id, label: user.name }))
                  : [{ value: task.assignedTo.id, label: task.assignedTo.name }]
              }
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
        {assigneesError && (
          <p className="text-[12px] text-[#EF4444]">{assigneesError}</p>
        )}

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
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Дата"
              />
            </div>
            <div className="flex-1">
              <Input
                type="time"
                disabled={!editable}
                value={time}
                onChange={(e) => setTime(e.target.value)}
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
            maxLength={2000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={textareaClass}
          />
        </div>

        {formError && <p className="text-[12px] text-[#EF4444]">{formError}</p>}
      </div>

      <div
        className="
          mt-6 flex items-center justify-between gap-3 pt-4
        "
      >
        <div className="flex items-center gap-3">
          {editable && (
            <Button
              variant="danger"
              size="sm"
              disabled={saving || deleting}
              onClick={() => void handleCancelTask()}
            >
              Отменить задачу
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="danger"
              size="sm"
              disabled={saving || deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Удаление..." : "Удалить"}
            </Button>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
          {editable && (
            <Button
              variant="primary"
              disabled={!isValid || saving || deleting}
              onClick={() => void handleSave()}
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
