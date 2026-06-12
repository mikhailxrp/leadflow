import type { Metadata } from 'next';
import TasksBoard from '@/components/tasks/TasksBoard';

export const metadata: Metadata = {
  title: 'Задачи',
};

export default function TasksPage() {
  return <TasksBoard />;
}
