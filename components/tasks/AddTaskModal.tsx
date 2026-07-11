"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import IconButton from "@/components/ui/IconButton";
import { createTaskSchema } from "@/lib/validations/tasks";
import { toIsoFromLocalParts } from "@/components/tasks/taskConstants";
import { type TaskData } from "@/components/tasks/TaskItem";

interface AssignableUser {
  id: string;
  name: string;
}

interface AddTaskModalProps {
  leadId: string;
  title?: string;
  onClose: () => void;
  onCreated: (task: TaskData) => void;
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

interface ModalSelectProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
}

function ModalSelect({
  label,
  id,
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
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
          {options.length === 0 && (
            <option value="">{placeholder ?? "Нет доступных вариантов"}</option>
          )}
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
  title: modalTitle = "Новая задача",
  onClose,
  onCreated,
}: AddTaskModalProps): ReactNode {
  const [assignees, setAssignees] = useState<AssignableUser[] | null>(null);
  const [assigneesError, setAssigneesError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [description, setDescription] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const res = await fetch("/api/users/assignable");
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as AssignableUser[];
        if (cancelled) return;
        setAssignees(data);
        setAssignedToId((prev) => prev || (data[0]?.id ?? ""));
      } catch {
        if (!cancelled) setAssigneesError("Не удалось загрузить исполнителей");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const isValid = title.trim().length > 0 && assignedToId.length > 0;

  async function handleCreate(): Promise<void> {
    if (!isValid) return;

    setFieldError(null);
    setFormError(null);

    const dueDate = toIsoFromLocalParts(date, time);
    const payload = {
      title: title.trim(),
      assignedToId,
      ...(dueDate ? { dueDate } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
    };

    const parsed = createTaskSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message ?? "Проверьте заполненные поля");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(`/api/leads/${leadId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setFormError(
            body?.error === "ASSIGNEE_INVALID"
              ? "Исполнитель недоступен — выберите другого"
              : "Проверьте заполненные поля",
          );
        } else {
          setFormError("Не удалось создать задачу");
        }
        return;
      }

      const created = (await res.json()) as TaskData;
      onCreated(created);
      onClose();
    } catch {
      setFormError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      onClose={onClose}
      dialogClassName="w-[480px] max-w-[480px] rounded-[12px] p-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-medium text-[var(--color-text-primary)]">
          {modalTitle}
        </h2>
        <IconButton
          size="sm"
          onClick={onClose}
          aria-label="Закрыть"
          icon={<span aria-hidden="true">✕</span>}
        />
      </div>

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
            maxLength={200}
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
          disabled={assignees === null}
          placeholder={assigneesError ?? "Загрузка..."}
          options={(assignees ?? []).map((user) => ({ value: user.id, label: user.name }))}
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
            maxLength={2000}
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

        {(fieldError || formError) && (
          <p className="text-[12px] text-[#EF4444]">{fieldError ?? formError}</p>
        )}
      </div>

      <div
        className="
          mt-6 flex justify-end gap-3 pt-4
        "
      >
        <Button variant="secondary" onClick={onClose}>
          Отмена
        </Button>
        <Button
          variant="primary"
          disabled={!isValid || saving}
          onClick={() => void handleCreate()}
        >
          {saving ? "Создание..." : "Создать"}
        </Button>
      </div>
    </Modal>
  );
}
