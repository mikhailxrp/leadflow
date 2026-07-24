import Avatar from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';

interface LeadContactsProps {
  name: string | null;
  phone: string | null;
  email: string | null;
  createdAt: string;
}

function PhoneIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0 text-[var(--color-text-tertiary)]"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function LeadContacts({ name, phone, email, createdAt }: LeadContactsProps) {
  return (
    <Card padding="lg">
      <div className="mb-5 flex items-center gap-4">
        {/* Аватар скрыт на узких экранах (< sm), чтобы имя лида помещалось по всей ширине карточки */}
        <div className="hidden shrink-0 sm:block">
          <Avatar initials={getInitials(name)} size="lg" className="h-14 w-14 text-[15px]" />
        </div>
        <div className="min-w-0">
          <p className="text-[18px] font-medium text-[var(--color-text-primary)] break-words">
            {name ?? <span className="text-[var(--color-text-tertiary)]">Без имени</span>}
          </p>
          <p className="text-[13px] text-[var(--color-text-tertiary)]">
            Добавлен {formatDate(createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 border-t border-[0.5px] border-[var(--color-border)] px-3 pb-3 pt-3 sm:grid-cols-2">
        <div className="flex items-center gap-2.5">
          <PhoneIcon />
          {phone ? (
            <a
              href={`tel:${phone.replace(/\s/g, '')}`}
              className="text-[14px] text-[var(--color-text-primary)] transition-colors duration-150 hover:text-[var(--color-primary)]"
            >
              {phone}
            </a>
          ) : (
            <span className="text-[14px] text-[var(--color-text-tertiary)]">не указан</span>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          <EmailIcon />
          {email ? (
            <a
              href={`mailto:${email}`}
              className="text-[14px] text-[var(--color-primary)] transition-colors duration-150 hover:text-[var(--color-primary-hover)]"
            >
              {email}
            </a>
          ) : (
            <span className="text-[14px] text-[var(--color-text-tertiary)]">не указан</span>
          )}
        </div>
      </div>
    </Card>
  );
}
