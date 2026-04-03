import type React from 'react';
import { AlertTriangle, CheckCircle2, CircleOff, Loader2 } from 'lucide-react';

import { Button } from './button';

type StatePanelVariant = 'loading' | 'empty' | 'error' | 'success';

const config: Record<StatePanelVariant, { icon: React.ComponentType<{ className?: string }>; title: string; tone: string }> = {
  loading: {
    icon: Loader2,
    title: 'Cargando',
    tone: 'bg-muted text-muted-foreground',
  },
  empty: {
    icon: CircleOff,
    title: 'Sin datos',
    tone: 'bg-muted text-muted-foreground',
  },
  error: {
    icon: AlertTriangle,
    title: 'Algo salio mal',
    tone: 'bg-rose-100 text-rose-700',
  },
  success: {
    icon: CheckCircle2,
    title: 'Exito',
    tone: 'bg-emerald-100 text-emerald-700',
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
  const Icon = config[variant].icon;

  return (
    <div className={`rounded-2xl border border-border/70 bg-surface/80 text-center shadow-card ${compact ? 'p-4' : 'p-6'}`}>
      <div className={`mx-auto mb-3 inline-flex items-center justify-center rounded-full ${compact ? 'h-9 w-9' : 'h-11 w-11'} ${config[variant].tone}`}>
        <Icon className={`h-5 w-5 ${variant === 'loading' ? 'animate-spin' : ''}`} />
      </div>
      <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-foreground">{config[variant].title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction ? (
        <Button onClick={onAction} className="mt-4" size="sm" variant={variant === 'error' ? 'outline' : 'default'}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
