import type { Prisma } from '@prisma/client';

export const COMMENT_SELECT = {
  id: true,
  text: true,
  createdAt: true,
  user: {
    select: {
      name: true,
    },
  },
} satisfies Prisma.CommentSelect;

type CommentRecord = Prisma.CommentGetPayload<{ select: typeof COMMENT_SELECT }>;

export function serializeComment(comment: CommentRecord): {
  id: string;
  text: string;
  createdAt: string;
  user: { name: string };
} {
  return {
    id: comment.id,
    text: comment.text,
    createdAt: comment.createdAt.toISOString(),
    user: comment.user,
  };
}
