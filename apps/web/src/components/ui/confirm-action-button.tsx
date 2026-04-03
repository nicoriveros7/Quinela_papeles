'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { Button } from './button';

type ConfirmActionButtonProps = {
  label: string;
  confirmLabel?: string;
  title: string;
  description: string;
  onConfirm: () => Promise<void> | void;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
};

export function ConfirmActionButton({
  label,
  confirmLabel = 'Confirmar',
  title,
  description,
  onConfirm,
  disabled,
  variant = 'default',
  size = 'sm',
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
      <Button size={size} variant={variant} onClick={() => setOpen(true)} disabled={disabled}>
        {label}
      </Button>
    );
  }

  return (
    <div className="grid gap-2 rounded-xl border border-amber-300/50 bg-amber-50 p-3 text-sm text-amber-900">
      <div className="inline-flex items-center gap-2 font-semibold">
        <AlertTriangle className="h-4 w-4" />
        {title}
      </div>
      <p className="text-xs text-amber-800">{description}</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => void runConfirm()} disabled={loading}>
          {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
          {loading ? 'Procesando...' : confirmLabel}
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}
