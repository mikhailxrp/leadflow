"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import Button from "@/components/ui/Button";
import TaskGroup from "@/components/tasks/TaskGroup";
import CreateTaskModal from "@/components/tasks/CreateTaskModal";
import { type TaskGroupType, type TaskItem } from "@/components/tasks/TaskRow";

const MOCK_LEAD_DETAIL_PATH = "/leads/1";

type TaskTab = "all" | "mine" | "overdue";

const MOCK_TASKS: TaskItem[] = [
  {
    id: "1",
    title: "Перезвонить по вопросу интеграции",
    lead: { id: "1", name: "Иван Петров", icon: "phone" },
    assignee: "Алексей Д.",
    dateLabel: "12 мая",
    dateIcon: "calendar-event",
    isOverdueDate: true,
    status: "IN_PROGRESS",
    group: "overdue",
  },
  {
    id: "2",
    title: "Отправить коммерческое предложение",
    lead: { id: "2", name: "ООО Вектор", icon: "building" },
    assignee: "Мария С.",
    dateLabel: "14 мая",
    dateIcon: "calendar-event",
    isOverdueDate: true,
    status: "NEW",
    group: "overdue",
  },
  {
    id: "3",
    title: "Провести демо-звонок",
    lead: { id: "3", name: "ЗАО Альянс", icon: "phone" },
    assignee: "Иван К.",
    dateLabel: "15:00",
    dateIcon: "clock",
    status: "IN_PROGRESS",
    group: "today",
  },
  {
    id: "4",
    title: "Согласовать условия договора",
    lead: { id: "4", name: "Группа Самолёт", icon: "building" },
    assignee: "Алексей Д.",
    dateLabel: "16:30",
    dateIcon: "clock",
    status: "NEW",
    group: "today",
  },
  {
    id: "5",
    title: "Подготовить техническое задание",
    lead: { id: "5", name: "РЖД Логистика", icon: "building" },
    assignee: "Алексей Д.",
    dateLabel: "20 июня",
    status: "NEW",
    group: "upcoming",
  },
  {
    id: "6",
    title: "Встреча в офисе клиента",
    lead: { id: "6", name: "Ресторан Пушкин", icon: "user" },
    assignee: "Мария С.",
    dateLabel: "22 июня",
    status: "NEW",
    group: "upcoming",
  },
];

const TABS: { id: TaskTab; label: string }[] = [
  { id: "all", label: "Все" },
  { id: "mine", label: "Мои" },
  { id: "overdue", label: "Просроченные" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Все" },
  { value: "new", label: "Новая" },
  { value: "in-progress", label: "В работе" },
];

const ASSIGNEE_FILTER_OPTIONS = [
  { value: "any", label: "Любой" },
  { value: "alexey", label: "Алексей Д." },
  { value: "maria", label: "Мария С." },
  { value: "ivan", label: "Иван К." },
];

const GROUP_ORDER: TaskGroupType[] = ["overdue", "today", "upcoming"];

interface InlineFilterSelectProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function InlineFilterSelect({
  label,
  id,
  value,
  onChange,
  options,
}: InlineFilterSelectProps): ReactNode {
  const selectedLabel = options.find((opt) => opt.value === value)?.label ?? "";

  return (
    <div className="relative">
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          h-[32px] appearance-none rounded-[6px]
          border border-[var(--color-border)] border-[0.5px]
          bg-[var(--color-bg-surface)] pl-3 pr-7
          text-[13px] text-[var(--color-text-primary)]
          outline-none transition-all duration-150
          focus:border-[#10B981] focus:ring-1 focus:ring-[#10B981]
        "
        aria-label={`${label}: ${selectedLabel}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {label}: {opt.label}
          </option>
        ))}
      </select>
      <Icon
        icon="tabler:chevron-down"
        className="
          pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5
          -translate-y-1/2 text-[var(--color-text-tertiary)]
        "
        aria-hidden="true"
      />
    </div>
  );
}

export default function TasksBoard(): ReactNode {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>(MOCK_TASKS);
  const [activeTab, setActiveTab] = useState<TaskTab>("overdue");
  const [statusFilter, setStatusFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("any");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const hasActiveFilters = statusFilter !== "all" || assigneeFilter !== "any";

  function handleResetFilters(): void {
    setStatusFilter("all");
    setAssigneeFilter("any");
  }

  function handleToggleDone(id: string): void {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, done: true, status: "DONE" } : task,
      ),
    );
  }

  function handleTaskClick(task: TaskItem): void {
    // TODO: router.push(`/leads/${task.lead.id}?taskId=${task.id}`)
    router.push(`${MOCK_LEAD_DETAIL_PATH}?taskId=${task.id}`);
  }

  function filterTasks(task: TaskItem): boolean {
    if (activeTab === "overdue" && task.group !== "overdue") return false;
    if (activeTab === "mine" && task.assignee !== "Алексей Д.") return false;

    if (statusFilter === "new" && task.status !== "NEW") return false;
    if (statusFilter === "in-progress" && task.status !== "IN_PROGRESS")
      return false;

    if (assigneeFilter === "alexey" && task.assignee !== "Алексей Д.")
      return false;
    if (assigneeFilter === "maria" && task.assignee !== "Мария С.")
      return false;
    if (assigneeFilter === "ivan" && task.assignee !== "Иван К.") return false;

    return true;
  }

  const visibleTasks = tasks.filter(filterTasks);
  const totalCount = 12;

  return (
    <>
      <header
        className="
          sticky top-0 z-30 flex h-[56px] shrink-0 items-center justify-between
          border-b border-[var(--color-border)] border-[0.5px]
          bg-[var(--color-bg-surface)] px-6
        "
      >
        <div className="flex items-center">
          <h1 className="text-[20px] font-medium tracking-[-0.01em] text-[var(--color-text-primary)]">
            Задачи
          </h1>
          <span
            className="
              ml-2 inline-flex items-center rounded-[20px]
              bg-[var(--color-bg-surface-2)] px-2.5 py-0.5
              text-[12px] font-medium text-[var(--color-text-secondary)]
            "
          >
            {totalCount}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            className="w-[28px] px-0"
            icon={<Icon icon="tabler:dots-vertical" className="h-4 w-4" />}
            aria-label="Дополнительные действия"
            onClick={() => {
              // TODO: меню действий
            }}
          >
            <span className="sr-only">Меню</span>
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={<Icon icon="tabler:plus" className="h-4 w-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Создать задачу
          </Button>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-auto p-6">
        <div
          className="
            flex items-center justify-between"
        >
          <nav className="flex gap-6" aria-label="Фильтр задач">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    pb-3 px-3 text-[13px] transition-colors duration-150
                    ${
                      isActive
                        ? "border-b-2 border-[#10B981] font-medium text-[#10B981]"
                        : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    }
                  `}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3 pb-3">
            <InlineFilterSelect
              label="Статус"
              id="filter-status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTER_OPTIONS}
            />
            <InlineFilterSelect
              label="Исполнитель"
              id="filter-assignee"
              value={assigneeFilter}
              onChange={setAssigneeFilter}
              options={ASSIGNEE_FILTER_OPTIONS}
            />
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="
                  text-[13px] text-[var(--color-text-secondary)]
                  transition-colors duration-150
                  hover:text-[var(--color-text-primary)]
                "
              >
                ✕ Сбросить
              </button>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-6">
          {GROUP_ORDER.map((group) => {
            const groupTasks = visibleTasks.filter(
              (task) => task.group === group,
            );

            return (
              <TaskGroup
                key={group}
                group={group}
                tasks={groupTasks}
                onToggleDone={handleToggleDone}
                onTaskClick={handleTaskClick}
              />
            );
          })}
        </div>
      </main>

      {isModalOpen && (
        <CreateTaskModal
          onClose={() => setIsModalOpen(false)}
          onCreate={(data) => {
            console.log("Create task", data);
          }}
        />
      )}
    </>
  );
}
