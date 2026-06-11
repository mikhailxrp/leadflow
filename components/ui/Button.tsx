import { type ButtonHTMLAttributes, type ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  children: ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:   'bg-[#10B981] hover:bg-[#0E9E6E] text-white border-transparent',
  secondary: 'bg-[var(--color-bg-surface-2)] hover:bg-[var(--color-bg-surface)] text-[var(--color-text-primary)] border-[var(--color-border)] border-[0.5px]',
  danger:    'bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#DC2626] border-[#FECACA] border-[0.5px]',
  ghost:     'bg-transparent hover:bg-[var(--color-bg-surface-2)] text-[var(--color-text-secondary)] border-transparent',
};

const sizeClasses: Record<Size, string> = {
  sm: 'h-[28px] px-[10px] text-[12px]',
  md: 'h-[36px] px-[14px] text-[13px]',
  lg: 'h-[42px] px-[18px] text-[14px]',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2
        font-medium rounded-[6px]
        transition-all duration-150
        cursor-pointer select-none
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      {...props}
    >
      {icon && <span className="w-4 h-4 flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
