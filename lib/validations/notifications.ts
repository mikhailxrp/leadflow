import { z } from 'zod';
import {
  DEFAULT_NOTIFICATIONS_LIMIT,
  MAX_NOTIFICATIONS_LIMIT,
} from '@/constants/notifications';

export const notificationsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(MAX_NOTIFICATIONS_LIMIT)
    .default(DEFAULT_NOTIFICATIONS_LIMIT),
});

export type NotificationsQueryInput = z.infer<typeof notificationsQuerySchema>;
