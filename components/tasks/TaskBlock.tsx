"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import AddTaskModal from "@/components/tasks/AddTaskModal";
import EditTaskModal from "@/components/tasks/EditTaskModal";
import TaskItem, { type TaskData } from "@/components/tasks/TaskItem";
import {
  ACTIVE_STATUSES,
  compareActiveTasks,
  compareInactiveTasks,
  getNextStatusOnCircleClick,
  INACTIVE_STATUSES,
} from "@/components/tasks/taskConstants";

function TaskIcon(): ReactNode {
  return (
    <Icon
      icon="tabler:clipboard-check"
      className="h-4 w-4 text-[var(--color-text-tertiary)]"
      aria-hidden="true"
    />
  );
}

interface TaskBlockProps {
  leadId: string;
  currentUserId: string;
  canDelete: boolean;
  highlightTaskId?: string;
  /** Закрытый лид: задачи видны, но не создаются, не правятся и не меняют статус. */
  readOnly?: boolean;
}

export default function TaskBlock({
  leadId,
  currentUserId,
  canDelete,
  highlightTaskId,
  readOnly = false,
}: TaskBlockProps): ReactNode {
  const [tasks, setTasks] = useState<TaskData[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(
    highlightTaskId,
  );
  const hasScrolledToHighlight = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      try {
        const res = await fetch(`/api/leads/${leadId}/tasks`);
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as TaskData[];
        if (!cancelled) setTasks(data);
      } catch {
        if (!cancelled) setLoadError("Не удалось загрузить задачи");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const editingTask = editingTaskId
    ? ((tasks ?? []).find((task) => task.id === editingTaskId) ?? null)
    : null;

  const activeTasks = useMemo(
    () =>
      (tasks ?? [])
        .filter((task) => ACTIVE_STATUSES.includes(task.status))
        .sort(compareActiveTasks),
    [tasks],
  );

  const inactiveTasks = useMemo(
    () =>
      (tasks ?? [])
        .filter((task) => INACTIVE_STATUSES.includes(task.status))
        .sort(compareInactiveTasks),
    [tasks],
  );

  const activeCount = activeTasks.length;
  const highlightedTask = highlightTaskId
    ? (tasks ?? []).find((task) => task.id === highlightTaskId)
    : undefined;
  const shouldExpandCompletedByHighlight =
    highlightedTask !== undefined &&
    INACTIVE_STATUSES.includes(highlightedTask.status);
  const isCompletedSectionExpanded =
    isCompletedExpanded || shouldExpandCompletedByHighlight;

  useEffect(() => {
    hasScrolledToHighlight.current = false;
  }, [highlightTaskId]);

  useEffect(() => {
    if (!highlightTaskId || hasScrolledToHighlight.current) return;
    if (!highlightedTask) return;

    const element = document.getElementById(`task-${highlightTaskId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      hasScrolledToHighlight.current = true;
    }
  }, [highlightTaskId, highlightedTask]);

  function canEditTask(task: TaskData): boolean {
    if (readOnly) return false;
    return canDelete || task.createdById === currentUserId;
  }

  async function handleStatusCycle(id: string): Promise<void> {
    const task = (tasks ?? []).find((t) => t.id === id);
    if (!task) return;

    const nextStatus = getNextStatusOnCircleClick(task.status);
    if (!nextStatus) return;

    setSelectedTaskId(id);
    if (nextStatus === "DONE") setIsCompletedExpanded(true);

    try {
      const res = await fetch(`/api/leads/${task.leadId}/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) return;

      const updated = (await res.json()) as TaskData;
      setTasks((prev) => (prev ?? []).map((t) => (t.id === id ? updated : t)));
    } catch {
      // сеть недоступна — оставляем задачу без изменений, сервер остаётся источником истины
    }
  }

  function handleSelectTask(id: string): void {
    setSelectedTaskId(id);
  }

  function handleEditTask(id: string): void {
    setSelectedTaskId(id);
    setEditingTaskId(id);
  }

  function handleCreated(task: TaskData): void {
    setTasks((prev) => [...(prev ?? []), task]);
  }

  function handleUpdated(task: TaskData): void {
    setTasks((prev) => (prev ?? []).map((t) => (t.id === task.id ? task : t)));
    if (INACTIVE_STATUSES.includes(task.status)) setIsCompletedExpanded(true);
  }

  function handleDeleted(taskId: string): void {
    setTasks((prev) => (prev ?? []).filter((t) => t.id !== taskId));
  }

  function isTaskHighlighted(taskId: string): boolean {
    return (highlightTaskId ?? selectedTaskId) === taskId;
  }

  const isLoading = tasks === null && !loadError;
  const isEmpty = (tasks ?? []).length === 0;

  return (
    <>
      <Card padding="lg">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-[14px] font-medium text-[var(--color-text-primary)]">
            <TaskIcon />
            Задачи по лиду
          </h2>

          <div className="flex items-center gap-2">
            {activeCount > 0 && (
              <span
                className="
                  rounded-[20px] bg-[var(--color-bg-surface-2)]
                  px-2 py-0.5 text-[12px] font-medium
                  text-[var(--color-text-secondary)]
                "
              >
                {activeCount}
              </span>
            )}
            {!readOnly && (
              <Button
                variant="ghost"
                size="sm"
                icon={<Icon icon="tabler:plus" className="h-3.5 w-3.5" />}
                onClick={() => setIsAddModalOpen(true)}
              >
                Создать
              </Button>
            )}
          </div>
        </div>

        {loadError && <p className="text-[13px] text-[#EF4444]">{loadError}</p>}

        {isLoading && (
          <p className="text-[13px] text-[var(--color-text-secondary)]">
            Загрузка...
          </p>
        )}

        {!isLoading && !loadError && (
          <>
            {isEmpty ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <p className="text-[13px] text-[var(--color-text-secondary)]">
                  Нет задач по этому лиду
                </p>
                {!readOnly && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAddModalOpen(true)}
                  >
                    Создать задачу
                  </Button>
                )}
              </div>
            ) : (
              <>
                {activeTasks.length > 0 ? (
                  <ul className="flex flex-col divide-y divide-[var(--color-border)]">
                    {activeTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        variant="card"
                        highlighted={isTaskHighlighted(task.id)}
                        canEdit={canEditTask(task)}
                        onStatusCycle={(id) => void handleStatusCycle(id)}
                        onSelect={handleSelectTask}
                        onEdit={handleEditTask}
                      />
                    ))}
                  </ul>
                ) : (
                  <p className="pb-2 text-[13px] text-[var(--color-text-secondary)]">
                    Нет активных задач
                  </p>
                )}

                {inactiveTasks.length > 0 && (
                  <div className="mt-3 border-t border-[var(--color-border)] border-[0.5px] pt-3">
                    <button
                      type="button"
                      onClick={() => setIsCompletedExpanded((prev) => !prev)}
                      className="
                        flex w-full items-center justify-between gap-2
                        rounded-[6px] px-2 py-1.5 text-left
                        text-[12px] font-medium text-[var(--color-text-secondary)]
                        transition-colors duration-150
                        hover:text-[var(--color-text-primary)]
                      "
                      aria-expanded={isCompletedSectionExpanded}
                    >
                      <span>
                        Выполненные и отменённые ({inactiveTasks.length})
                      </span>
                      <Icon
                        icon={
                          isCompletedSectionExpanded
                            ? "tabler:chevron-up"
                            : "tabler:chevron-down"
                        }
                        className="h-4 w-4 shrink-0"
                        aria-hidden="true"
                      />
                    </button>

                    {isCompletedSectionExpanded && (
                      <ul className="mt-1 flex flex-col divide-y divide-[var(--color-border)]">
                        {inactiveTasks.map((task) => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            variant="card"
                            highlighted={isTaskHighlighted(task.id)}
                            canEdit={canEditTask(task)}
                            onStatusCycle={(id) => void handleStatusCycle(id)}
                            onSelect={handleSelectTask}
                            onEdit={handleEditTask}
                          />
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Card>

      {isAddModalOpen && (
        <AddTaskModal
          leadId={leadId}
          onClose={() => setIsAddModalOpen(false)}
          onCreated={handleCreated}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          isAdmin={canDelete}
          onClose={() => setEditingTaskId(null)}
          onUpdated={handleUpdated}
          onDeleted={handleDeleted}
        />
      )}
    </>
  );
}
