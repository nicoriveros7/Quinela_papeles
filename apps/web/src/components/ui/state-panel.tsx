import type React from 'react';
import { AlertTriangle, CheckCircle2, Inbox, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from './button';

// ── StatePanel ───────────────────────────────────────────────────────────────

type StatePanelVariant = 'loading' | 'empty' | 'error' | 'success';

const config: Record<
  StatePanelVariant,
  { icon: React.ComponentType<{ className?: string }>; title: string; iconWrap: string; iconColor: string }
> = {
  loading: {
    icon: Loader2,
    title: 'Cargando',
    iconWrap: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  empty: {
    icon: Inbox,
    title: 'Sin datos',
    iconWrap: 'bg-muted',
    iconColor: 'text-muted-foreground',
  },
  error: {
    icon: AlertTriangle,
    title: 'Algo salió mal',
    iconWrap: 'bg-rose-500/15',
    iconColor: 'text-rose-400',
  },
  success: {
    icon: CheckCircle2,
    title: 'Éxito',
    iconWrap: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
  },
};

export function StatePanel({
  variant,
  description,
  compact,
  actionLabel,
  onAction,
}: {
  variant: StatePanelVariant;
  description: string;
  compact?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { icon: Icon, title, iconWrap, iconColor } = config[variant];

  return (
    <div
      className={cn(
        'animate-fade-in rounded-2xl border border-border/60 bg-surface/80 text-center shadow-card-sm',
        compact ? 'p-4' : 'p-8',
      )}
    >
      {/* Icon container */}
      <div
        className={cn(
          'mx-auto mb-3 inline-flex items-center justify-center rounded-full',
          compact ? 'h-10 w-10' : 'h-12 w-12',
          iconWrap,
        )}
      >
        <Icon
          className={cn(
            compact ? 'h-5 w-5' : 'h-6 w-6',
            iconColor,
            variant === 'loading' && 'animate-spin',
          )}
        />
      </div>

      {/* Title */}
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
        {title}
      </p>

      {/* Description */}
      <p className={cn('mx-auto mt-1.5 max-w-sm text-sm text-foreground', compact ? 'text-xs' : '')}>
        {description}
      </p>

      {/* Action button */}
      {actionLabel && onAction ? (
        <Button
          onClick={onAction}
          className="mt-5"
          size="sm"
          variant={variant === 'error' ? 'outline' : 'default'}
        >
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

// ── Skeleton primitives ──────────────────────────────────────────────────────

/**
 * Single skeleton line. Use className to set height and width.
 * Example: <Skeleton className="h-4 w-full" />
 */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden="true" />;
}

/**
 * Multi-line skeleton block — useful for text content placeholders.
 * The last line is shorter (3/4 width) to mimic natural text endings.
 */
export function SkeletonBlock({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('grid animate-fade-in gap-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className={cn('h-4 rounded-md', i === lines - 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  );
}

/**
 * Card-sized skeleton for list/grid loading states.
 */
export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-fade-in rounded-2xl border border-border/60 bg-surface/80 p-5 shadow-card-sm',
        className,
      )}
    >
      <Skeleton className="mb-3 h-4 w-1/3 rounded-md" />
      <SkeletonBlock lines={3} />
    </div>
  );
}
