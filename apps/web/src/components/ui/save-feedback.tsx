import { CheckCircle2, Loader2 } from 'lucide-react';

export function SaveFeedback({
  saving,
  message,
}: {
  saving: boolean;
  message: string | null;
}) {
  if (saving) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Guardando cambios...
      </div>
    );
  }

  if (!message) {
    return null;
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-700">
      <CheckCircle2 className="h-3.5 w-3.5" />
      {message}
    </div>
  );
}
