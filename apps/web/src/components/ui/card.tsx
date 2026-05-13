import * as React from 'react';

import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * interactive — adds hover lift + deeper shadow for clickable cards.
   * Does NOT add cursor-pointer or role; callers should wrap in <Link>/<button>
   * or add those themselves.
   */
  interactive?: boolean;
}

export function Card({ className, interactive = false, ...props }: CardProps) {
  return (
    <div
      className={cn(
        // Base card: consistent across all contexts
        'rounded-2xl border border-border/70 bg-surface/90 shadow-card backdrop-blur',
        // Interactive lift — 2px translateY + deeper shadow on hover,
        // springs back instantly on active press (active:translate-y-0).
        interactive &&
          'cursor-pointer transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-card-hover hover:border-border/90 active:translate-y-0 active:shadow-card',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pt-5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-base font-bold tracking-tight text-foreground', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />;
}
