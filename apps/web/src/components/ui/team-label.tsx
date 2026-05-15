import { cn } from '@/lib/utils';

interface TeamLabelProps {
  name: string;
  code?: string | null;
  flagEmoji?: string | null;
  format?: 'full' | 'compact' | 'flag-only';
  className?: string;
}

/**
 * Renders a team identity with optional flag emoji.
 *
 * - full:      🇦🇷 Argentina
 * - compact:   🇦🇷 ARG
 * - flag-only: 🇦🇷 (aria-label = name)
 *
 * Falls back gracefully: if no flagEmoji, renders code or name without emoji.
 * The emoji span is always aria-hidden; the visible text carries the meaning.
 */
export function TeamLabel({
  name,
  code,
  flagEmoji,
  format = 'full',
  className,
}: TeamLabelProps) {
  if (format === 'flag-only') {
    return (
      <span className={className} aria-label={name} role="img">
        {flagEmoji ?? code?.[0] ?? '?'}
      </span>
    );
  }

  if (format === 'compact') {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        {flagEmoji && <span aria-hidden="true">{flagEmoji}</span>}
        <span>{code ?? name}</span>
      </span>
    );
  }

  // full
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {flagEmoji && <span aria-hidden="true">{flagEmoji}</span>}
      <span>{name}</span>
    </span>
  );
}
