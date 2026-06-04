import * as React from 'react';

import { cn } from '@/lib/utils';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'muted' | 'danger' | 'live';

const variantStyles: Record<BadgeVariant, string> = {
  default:  'bg-primary/15 text-primary border-primary/30',
  success:  'bg-emerald-500/15 text-emerald-300 border-emerald-400/30',
  warning:  'bg-primary/10 text-primary/80 border-primary/25',
  muted:    'bg-muted text-muted-foreground border-border',
  danger:   'bg-rose-500/15 text-rose-300 border-rose-400/30',
  // Live match — red dot with pulse animation signals real-time activity
  live:     'bg-rose-500/10 text-rose-400 border-rose-400/30',
};

export function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-[0.08em]',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {variant === 'live' && (
        // Pulsing dot — aria-hidden so screen readers only read the text label
        <span
          className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse-dot"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}
