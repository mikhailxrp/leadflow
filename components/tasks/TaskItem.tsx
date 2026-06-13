"use client";

import { type MouseEvent, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import TaskStatusBadge, {
  type TaskStatus,
} from "@/components/tasks/TaskStatusBadge";
import IconButton from "@/components/ui/IconButton";

export interface TaskData {
  id: string;
  leadId: string;
  title: string;
  assigneeName: string;
  assigneeId: string;
  dueDateLabel: string;
  dueDate?: string;
  dueTime?: string;
  description?: string;
  completedAtLabel?: string;
  status: TaskStatus;
  isOverdue: boolean;
}

interface TaskItemProps {
  task: TaskData;
  variant?: "card" | "list";
  highlighted?: boolean;
  onStatusCycle: (id: string) => void;
  onSelect?: (id: string) => void;
  onEdit?: (id: string) => void;
  onLeadClick?: (leadId: string) => void;
}

export default function TaskItem({
  task,
  variant = "list",
  highlighted = false,
  onStatusCycle,
  onSelect,
  onEdit,
  onLeadClick,
}: TaskItemProps): ReactNode {
  const isDone = task.status === "DONE";
  const isCancelled = task.status === "CANCELLED";
  const isInactive = isDone || isCancelled;
  const isInProgress = task.status === "IN_PROGRESS";

  function handleCircleClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    event.preventDefault();

    if (isCancelled) return;

    // TODO: PATCH /api/leads/:leadId/tasks/:taskId { status }
    onStatusCycle(task.id);
  }

  function handleContentClick(event: MouseEvent<HTMLDivElement>): void {
    event.stopPropagation();

    if (variant === "card") {
      onSelect?.(task.id);
      onEdit?.(task.id);
      return;
    }

    onLeadClick?.(task.leadId);
  }

  function handleEditClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    onSelect?.(task.id);
    onEdit?.(task.id);
  }

  function handleLeadClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    onLeadClick?.(task.leadId);
  }

  const metaDateLabel =
    isDone && task.completedAtLabel ? task.completedAtLabel : task.dueDateLabel;

  const metaPrefix = isDone ? "выполнено" : "до";

  return (
    <li
      id={`task-${task.id}`}
      className={`
        flex gap-3 rounded-[6px] px-2 py-2.5
        ${highlighted ? "bg-[var(--color-primary-light)] ring-1 ring-[var(--color-primary)]" : ""}
      `}
    >
      <button
        type="button"
        onClick={handleCircleClick}
        disabled={isCancelled}
        aria-disabled={isCancelled}
        className={`
          mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center
          rounded-full border-[1.5px] transition-colors duration-150
          ${
            isCancelled
              ? "pointer-events-none cursor-default opacity-50"
              : "cursor-pointer hover:border-[var(--color-primary)]"
          }
          ${
            isDone
              ? "border-[var(--color-primary)] bg-[var(--color-primary)]"
              : isInProgress
                ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]"
                : "border-[var(--color-border)] bg-transparent"
          }
        `}
        aria-label={
          isCancelled
            ? "Задача отменена"
            : isDone
              ? "Вернуть в работу"
              : isInProgress
                ? "Отметить выполненной"
                : "Взять в работу"
        }
        aria-pressed={isDone || isInProgress}
      >
        {isDone && (
          <Icon
            icon="tabler:check"
            className="h-3 w-3 text-white"
            aria-hidden="true"
          />
        )}
        {isInProgress && (
          <span
            className="h-2 w-2 rounded-full bg-[var(--color-primary)]"
            aria-hidden="true"
          />
        )}
      </button>

      <div
        role={variant === "card" ? "button" : undefined}
        tabIndex={variant === "card" ? 0 : undefined}
        onClick={variant === "card" ? handleContentClick : undefined}
        onKeyDown={
          variant === "card"
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect?.(task.id);
                }
              }
            : undefined
        }
        className={`
          min-w-0 flex-1 rounded-[4px]
          ${
            variant === "card"
              ? "cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-primary)]"
              : ""
          }
        `}
      >
        <div className="flex items-start justify-between gap-2">
          <p
            className={`
              min-w-0 flex-1 text-[13px] font-medium text-[var(--color-text-primary)]
              ${isInactive ? "line-through opacity-60" : ""}
            `}
          >
            {task.title}
          </p>
          {variant === "card" && (
            <div className="flex shrink-0 items-center gap-1.5">
              <IconButton
                size="sm"
                onClick={handleEditClick}
                aria-label="Редактировать задачу"
                icon={
                  <Icon
                    icon="tabler:pencil"
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  />
                }
              />
              <TaskStatusBadge status={task.status} />
            </div>
          )}
        </div>

        <div
          className={`
            mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5
            text-[12px]
            ${
              task.isOverdue && !isInactive
                ? "text-[#EF4444]"
                : "text-[var(--color-text-tertiary)]"
            }
          `}
        >
          <span>{task.assigneeName}</span>
          {metaDateLabel && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {variant === "card" && !isDone ? metaPrefix : ""}
                {variant === "card" && !isDone ? " " : ""}
                {metaDateLabel}
              </span>
            </>
          )}
        </div>

        {variant === "list" && (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleLeadClick}
              className="
                flex items-center gap-1.5 text-[12px]
                text-[var(--color-text-secondary)]
                transition-colors duration-150 hover:text-[var(--color-text-primary)]
              "
            >
              <Icon
                icon="tabler:user"
                className="h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              {task.assigneeName}
            </button>
            <TaskStatusBadge status={task.status} />
          </div>
        )}
      </div>
    </li>
  );
}
