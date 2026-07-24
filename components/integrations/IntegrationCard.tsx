import { type ReactNode } from 'react';
import Card from '@/components/ui/Card';

interface IntegrationCardProps {
  icon: ReactNode;
  title: string;
  badge?: ReactNode;
  toggle?: ReactNode;
  description?: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function IntegrationCard({
  icon,
  title,
  badge,
  toggle,
  description,
  subtitle,
  children,
  footer,
}: IntegrationCardProps): ReactNode {
  return (
    <Card padding="none" className="p-6">
      <div className="mb-4 flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-3">
          {icon}
          <div className="min-w-0">
            <h2 className="text-[15px] font-medium text-[var(--color-text-primary)]">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-[13px] text-[var(--color-text-secondary)]">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        <div className="ml-auto flex flex-shrink-0 items-center gap-3">
          {toggle}
          {badge}
        </div>
      </div>

      {description && (
        <p className="mb-3 text-[13px] text-[var(--color-text-secondary)]">
          {description}
        </p>
      )}

      {children}

      {footer}
    </Card>
  );
}
