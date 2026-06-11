'use client';

import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

interface Comment {
  id: string;
  initials: string;
  author: string;
  time: string;
  text: string;
}

const MOCK_COMMENTS: Comment[] = [
  {
    id: '1',
    initials: 'АД',
    author: 'Алексей Д.',
    time: 'Сегодня, 11:45',
    text: 'Клиент просил перезвонить завтра после 14:00. Готов обсуждать тариф Про.',
  },
  {
    id: '2',
    initials: 'СА',
    author: 'Светлана А.',
    time: 'Вчера, 16:20',
    text: 'Отправила коммерческое предложение на почту, ждем обратную связь.',
  },
  {
    id: '3',
    initials: 'АД',
    author: 'Алексей Д.',
    time: '12 мая, 14:35',
    text: 'Первичный контакт. Выявил потребность в интеграции с 1С.',
  },
];

function CommentIcon() {
  return (
    <svg className="h-4 w-4 text-[var(--color-text-tertiary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

export default function LeadComments() {
  const [comment, setComment] = useState('');

  function handleSubmit(): void {
    // TODO: POST /api/leads/[id]/comments
    void comment;
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
          {MOCK_COMMENTS.length}
        </span>
      </div>

      <ul className="mb-5 flex flex-col gap-4">
        {MOCK_COMMENTS.map((item) => (
          <li key={item.id} className="flex gap-3">
            <Avatar initials={item.initials} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-medium text-[var(--color-text-primary)]">
                  {item.author}
                </span>
                <span className="text-[12px] text-[var(--color-text-tertiary)]">
                  {item.time}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
                {item.text}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-3">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Добавить комментарий..."
          rows={3}
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
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={handleSubmit}>
            Отправить
          </Button>
        </div>
      </div>
    </Card>
  );
}
