'use client';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}

export default function Toggle({
  checked,
  onChange,
  disabled = false,
  'aria-label': ariaLabel,
}: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer
        rounded-full transition-colors duration-150
        disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? 'bg-[#10B981]' : 'bg-[#94A3B8]'}
      `}
    >
      <span
        className={`
          absolute top-[2px] h-[20px] w-[20px] rounded-full bg-white
          transition-transform duration-150
          ${checked ? 'translate-x-[22px]' : 'translate-x-[2px]'}
        `}
      />
    </button>
  );
}
