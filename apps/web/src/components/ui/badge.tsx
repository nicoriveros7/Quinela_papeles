import * as React from 'react';

import { cn } from '@/lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'muted' | 'danger';

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-primary/15 text-primary border-primary/30',
  success: 'bg-emerald-500/15 text-emerald-700 border-emerald-400/30',
  warning: 'bg-amber-500/15 text-amber-700 border-amber-400/30',
  muted: 'bg-muted text-muted-foreground border-border',
  danger: 'bg-rose-500/15 text-rose-700 border-rose-400/30',
};

export function Badge({
  className,
  variant = 'default',
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
    />
  );
}
