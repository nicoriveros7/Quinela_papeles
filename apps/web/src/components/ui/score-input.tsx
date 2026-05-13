'use client';

import { cn } from '@/lib/utils';

interface ScoreInputProps {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  ariaLabel: string;
}

export function ScoreInput({ value, onChange, disabled = false, ariaLabel }: ScoreInputProps) {
  const numVal = value === '' ? null : parseInt(value, 10);
  const canDecrement = !disabled && numVal !== null && numVal > 0;
  const canIncrement = !disabled && (numVal === null || numVal < 99);

  const increment = () => {
    if (!canIncrement) return;
    onChange(String(numVal === null ? 1 : numVal + 1));
  };

  const decrement = () => {
    if (!canDecrement) return;
    onChange(String(numVal! - 1));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const raw = e.target.value;
    if (raw === '') {
      onChange('');
      return;
    }
    const n = parseInt(raw, 10);
    if (!isNaN(n)) {
      onChange(String(Math.min(99, Math.max(0, n))));
    }
  };

  return (
    <div
      className="inline-flex items-center gap-1.5"
      role="group"
      aria-label={ariaLabel}
    >
      {/* − */}
      <button
        type="button"
        aria-label="Restar un gol"
        disabled={!canDecrement}
        onClick={decrement}
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg font-bold',
          'transition-all duration-150 active:scale-[0.93]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          canDecrement
            ? 'border-border/60 bg-surface/90 text-foreground hover:border-primary/30 hover:bg-muted'
            : 'cursor-not-allowed border-border/30 bg-muted/40 text-muted-foreground/30',
        )}
      >
        −
      </button>

      {/* Number */}
      <input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        min={0}
        max={99}
        value={value}
        onChange={handleInputChange}
        disabled={disabled}
        placeholder="—"
        aria-label={ariaLabel}
        className={cn(
          'h-14 w-14 rounded-xl border border-border/60 bg-background text-center',
          'text-3xl font-extrabold tabular-nums leading-none',
          'placeholder:text-muted-foreground/40',
          'transition-colors focus:outline-none focus:ring-2 focus:ring-ring/60',
          'disabled:cursor-not-allowed disabled:opacity-60',
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        )}
      />

      {/* + */}
      <button
        type="button"
        aria-label="Sumar un gol"
        disabled={!canIncrement}
        onClick={increment}
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg font-bold',
          'transition-all duration-150 active:scale-[0.93]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          canIncrement
            ? 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
            : 'cursor-not-allowed border-border/30 bg-muted/40 text-muted-foreground/30',
        )}
      >
        +
      </button>
    </div>
  );
}
