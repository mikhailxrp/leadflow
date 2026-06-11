interface PasswordStrengthProps {
  strength?: 0 | 1 | 2 | 3 | 4;
}

const SEGMENTS = [
  { threshold: 1, filledClass: 'bg-[#EF4444]' },
  { threshold: 2, filledClass: 'bg-[#F59E0B]' },
  { threshold: 3, filledClass: 'bg-[#EAB308]' },
  { threshold: 4, filledClass: 'bg-[#10B981]' },
] as const;

export default function PasswordStrength({ strength = 0 }: PasswordStrengthProps) {
  return (
    <div
      className="flex gap-1"
      role="progressbar"
      aria-valuenow={strength}
      aria-valuemin={0}
      aria-valuemax={4}
    >
      {SEGMENTS.map((segment) => (
        <span
          key={segment.threshold}
          className={`
            h-[3px] flex-1 rounded-full
            ${strength >= segment.threshold ? segment.filledClass : 'bg-[var(--color-bg-surface-2)]'}
          `}
        />
      ))}
    </div>
  );
}

export function calculatePasswordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0;

  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password)) score += 1;

  return score as 0 | 1 | 2 | 3 | 4;
}
