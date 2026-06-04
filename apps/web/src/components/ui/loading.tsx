export function LoadingBlock({ label = 'Cargando...' }: { label?: string }) {
  return (
    <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-border bg-surface/60 px-4 py-8 text-sm text-muted-foreground">
      {label}
    </div>
  );
}
