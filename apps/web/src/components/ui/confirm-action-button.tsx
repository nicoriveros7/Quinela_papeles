'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';

import { Button } from './button';

type ConfirmActionButtonProps = {
  label: React.ReactNode;
  confirmLabel?: string;
  title: string;
  description: string;
  onConfirm: () => Promise<void> | void;
  disabled?: boolean;
  intent?: 'default' | 'destructive';
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  buttonClassName?: string;
  panelClassName?: string;
};

export function ConfirmActionButton({
  label,
  confirmLabel = 'Confirmar',
  title,
  description,
  onConfirm,
  disabled,
  intent = 'default',
  variant = 'default',
  size = 'sm',
  buttonClassName,
  panelClassName,
}: ConfirmActionButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const runConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button
        size={size}
        variant={variant}
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={buttonClassName}
      >
        {label}
      </Button>
    );
  }

  const isDestructive = intent === 'destructive';

  return (
    <div
      className={cn(
        'grid gap-2 rounded-xl border p-3 text-sm shadow-sm',
        isDestructive
          ? 'border-rose-200/70 bg-rose-50/80 text-rose-900'
          : 'border-amber-200/70 bg-amber-50/80 text-amber-900',
        panelClassName,
      )}
    >
      <div className="inline-flex items-center gap-2 font-semibold">
        {isDestructive
          ? <Trash2 className="h-4 w-4" />
          : <AlertTriangle className="h-4 w-4" />}
        {title}
      </div>
      <p className={cn('text-xs', isDestructive ? 'text-rose-700' : 'text-amber-800')}>
        {description}
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => void runConfirm()}
          disabled={loading}
          className={isDestructive
            ? 'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-500'
            : ''}
        >
          {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {loading ? 'Eliminando...' : confirmLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
