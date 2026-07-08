'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

export interface LeadCommentItem {
  id: string;
  text: string;
  createdAt: string;
  user: { name: string };
}

interface LeadCommentsProps {
  leadId: string;
  comments: LeadCommentItem[];
  canComment: boolean;
}

const MAX_COMMENT_LENGTH = 5000;

function CommentIcon() {
  return (
    <svg className="h-4 w-4 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function LeadComments({ leadId, comments, canComment }: LeadCommentsProps) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedText = text.trim();
  const canSubmit = trimmedText.length > 0 && !loading;

  async function handleSubmit(): Promise<void> {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/leads/${leadId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmedText }),
      });

      if (!res.ok) {
        setError('Не удалось отправить комментарий');
        return;
      }

      setText('');
      router.refresh();
    } catch {
      setError('Ошибка сети');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="lg">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[14px] font-medium text-[var(--color-text-primary)]">
          <CommentIcon />
          Комментарии
        </h2>
        <span
          className="
            rounded-[20px] bg-[var(--color-bg-surface-2)]
            px-2 py-0.5 text-[12px] font-medium
            text-[var(--color-text-secondary)]
          "
        >
          {comments.length}
        </span>
      </div>

      {comments.length === 0 ? (
        <p className="mb-5 text-[13px] text-[var(--color-text-secondary)]">
          Нет комментариев
        </p>
      ) : (
        <ul className="mb-5 flex flex-col gap-4">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="border-b-[0.5px] border-[var(--color-border)] pb-4 last:border-b-0 last:pb-0"
            >
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                  {comment.user.name}
                </span>
                <time
                  dateTime={comment.createdAt}
                  className="shrink-0 text-[11px] text-[var(--color-text-tertiary)]"
                >
                  {formatTime(comment.createdAt)}
                </time>
              </div>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
                {comment.text}
              </p>
            </li>
          ))}
        </ul>
      )}

      {canComment && (
      <div className="flex flex-col gap-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Добавить комментарий..."
          rows={3}
          maxLength={MAX_COMMENT_LENGTH}
          className="
            w-full resize-none rounded-[6px]
            border border-[var(--color-border)] border-[0.5px]
            bg-[var(--color-bg-surface)]
            px-3 py-2.5 text-[14px] text-[var(--color-text-primary)]
            placeholder:text-[var(--color-text-tertiary)]
            outline-none transition-all duration-150
            focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]
          "
        />
        <div className="flex items-center justify-between gap-3">
          {error ? (
            <span className="text-[11px] text-[var(--color-badge-danger-text)]">{error}</span>
          ) : (
            <span className="text-[11px] text-[var(--color-text-tertiary)]">
              {text.length}/{MAX_COMMENT_LENGTH}
            </span>
          )}
          <Button
            variant="primary"
            size="sm"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {loading ? 'Отправка...' : 'Отправить'}
          </Button>
        </div>
      </div>
      )}
    </Card>
  );
}
