"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "@iconify/react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import AddTaskModal, {
  type CreateTaskPayload,
} from "@/components/tasks/AddTaskModal";
import EditTaskModal, {
  type UpdateTaskPayload,
} from "@/components/tasks/EditTaskModal";
import TaskItem, { type TaskData } from "@/components/tasks/TaskItem";
import {
  ACTIVE_STATUSES,
  ASSIGNEE_LABELS,
  formatCompletedAtLabel,
  formatDueDateLabel,
  getNextStatusOnCircleClick,
  INACTIVE_STATUSES,
} from "@/components/tasks/taskConstants";
import { type TaskStatus } from "@/components/tasks/TaskStatusBadge";

const MOCK_TASKS: TaskData[] = [
  {
    id: "1",
    leadId: "1",
    title: "Перезвонить после 14:00",
    assigneeName: "Алексей Д.",
    assigneeId: "alexey",
    dueDateLabel: "12 мая",
    status: "IN_PROGRESS",
    isOverdue: true,
  },
  {
    id: "2",
    leadId: "1",
    title: "Отправить КП",
    assigneeName: "Мария С.",
    assigneeId: "maria",
    dueDateLabel: "10 мая",
    completedAtLabel: "10 мая",
    status: "DONE",
    isOverdue: false,
  },
  {
    id: "3",
    leadId: "1",
    title: "Подготовить демо-презентацию",
    assigneeName: "Алексей Д.",
    assigneeId: "alexey",
    dueDateLabel: "20 июня",
    status: "TODO",
    isOverdue: false,
  },
];

function TaskIcon(): ReactNode {
  return (
    <Icon
      icon="tabler:clipboard-check"
      className="h-4 w-4 text-[var(--color-text-tertiary)]"
      aria-hidden="true"
    />
  );
}

function applyStatusChange(task: TaskData, status: TaskStatus): TaskData {
  const isNowDone = status === "DONE";
  const isNowActive = ACTIVE_STATUSES.includes(status);

  return {
    ...task,
    status,
    isOverdue: isNowActive ? task.isOverdue : false,
    completedAtLabel: isNowDone ? formatCompletedAtLabel() : undefined,
  };
}

interface TaskBlockProps {
  leadId: string;
  highlightTaskId?: string;
}

export default function TaskBlock({
  leadId,
  highlightTaskId,
}: TaskBlockProps): ReactNode {
  const [tasks, setTasks] = useState<TaskData[]>(MOCK_TASKS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>(
    highlightTaskId,
  );
  const hasScrolledToHighlight = useRef(false);

  const editingTask = editingTaskId
    ? (tasks.find((task) => task.id === editingTaskId) ?? null)
    : null;

  const activeTasks = useMemo(
    () =>
      tasks
        .filter((task) => ACTIVE_STATUSES.includes(task.status))
        .sort((a, b) => {
          if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
          return a.dueDateLabel.localeCompare(b.dueDateLabel, "ru");
        }),
    [tasks],
  );

  const inactiveTasks = useMemo(
    () => tasks.filter((task) => INACTIVE_STATUSES.includes(task.status)),
    [tasks],
  );

  const activeCount = activeTasks.length;

  useEffect(() => {
    if (!highlightTaskId) return;

    setSelectedTaskId(highlightTaskId);
    hasScrolledToHighlight.current = false;
  }, [highlightTaskId]);

  useEffect(() => {
    if (!highlightTaskId || hasScrolledToHighlight.current) return;

    const highlighted = tasks.find((task) => task.id === highlightTaskId);
    if (!highlighted) return;

    if (INACTIVE_STATUSES.includes(highlighted.status)) {
      setIsCompletedExpanded(true);
    }

    const element = document.getElementById(`task-${highlightTaskId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "nearest" });
      hasScrolledToHighlight.current = true;
    }
  }, [highlightTaskId, tasks, isCompletedExpanded]);

  function handleStatusCycle(id: string): void {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;

        const nextStatus = getNextStatusOnCircleClick(task.status);
        if (!nextStatus) return task;

        setSelectedTaskId(id);

        if (nextStatus === "DONE") {
          setIsCompletedExpanded(true);
        }

        return applyStatusChange(task, nextStatus);
      }),
    );
  }

  function handleSelectTask(id: string): void {
    setSelectedTaskId(id);
  }

  function handleEditTask(id: string): void {
    setSelectedTaskId(id);
    setEditingTaskId(id);
  }

  function handleSaveTask(data: UpdateTaskPayload): void {
    const assigneeName =
      ASSIGNEE_LABELS[data.assignedToId] ?? data.assignedToId;
    const dueDateLabel = formatDueDateLabel(data.dueDate, data.dueTime);

    setTasks((prev) =>
      prev.map((task) =>
        task.id === data.id
          ? applyStatusChange(
              {
                ...task,
                title: data.title,
                assigneeId: data.assignedToId,
                assigneeName,
                dueDate: data.dueDate,
                dueTime: data.dueTime,
                dueDateLabel,
                description: data.description,
              },
              data.status,
            )
          : task,
      ),
    );
  }

  function handleCancelTask(id: string): void {
    setSelectedTaskId(id);
    setIsCompletedExpanded(true);

    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? applyStatusChange(task, "CANCELLED") : task,
      ),
    );
  }

  function isTaskHighlighted(taskId: string): boolean {
    return selectedTaskId === taskId;
  }

  function handleCreate(data: CreateTaskPayload): void {
    const assigneeName =
      ASSIGNEE_LABELS[data.assignedToId] ?? data.assignedToId;
    const dueDateLabel = formatDueDateLabel(data.dueDate, data.dueTime);

    setTasks((prev) => [
      {
        id: String(Date.now()),
        leadId,
        title: data.title,
        assigneeName,
        assigneeId: data.assignedToId,
        dueDate: data.dueDate,
        dueTime: data.dueTime,
        dueDateLabel,
        description: data.description,
        status: "TODO",
        isOverdue: false,
      },
      ...prev,
    ]);
  }

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
            <Button
              variant="ghost"
              size="sm"
              icon={<Icon icon="tabler:plus" className="h-3.5 w-3.5" />}
              onClick={() => setIsAddModalOpen(true)}
            >
              Создать
            </Button>
          </div>
        </div>

        {tasks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-[13px] text-[var(--color-text-secondary)]">
              Нет задач по этому лиду
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
            >
              Создать задачу
            </Button>
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
                    onStatusCycle={handleStatusCycle}
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
                  aria-expanded={isCompletedExpanded}
                >
                  <span>Выполненные и отменённые ({inactiveTasks.length})</span>
                  <Icon
                    icon={
                      isCompletedExpanded
                        ? "tabler:chevron-up"
                        : "tabler:chevron-down"
                    }
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                </button>

                {isCompletedExpanded && (
                  <ul className="mt-1 flex flex-col divide-y divide-[var(--color-border)]">
                    {inactiveTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        variant="card"
                        highlighted={isTaskHighlighted(task.id)}
                        onStatusCycle={handleStatusCycle}
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
      </Card>

      {isAddModalOpen && (
        <AddTaskModal
          leadId={leadId}
          onClose={() => setIsAddModalOpen(false)}
          onCreate={handleCreate}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onClose={() => setEditingTaskId(null)}
          onSave={handleSaveTask}
          onCancelTask={handleCancelTask}
        />
      )}
    </>
  );
}
