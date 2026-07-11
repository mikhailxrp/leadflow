import { TaskStatus } from '@prisma/client';
import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  assignedToId: z.string().min(1),
  dueDate: z.string().datetime().optional(),
  description: z.string().max(2000).optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  assignedToId: z.string().min(1).optional(),
  dueDate: z.string().datetime().optional(),
  description: z.string().max(2000).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
