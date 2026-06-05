'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const MINUTE_OPTIONS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

interface DateTimePickerProps {
  value: string; // UTC ISO string
  onConfirm: (isoString: string) => void;
  onClose: () => void;
  saving?: boolean;
}

export function DateTimePicker({ value, onConfirm, onClose, saving = false }: DateTimePickerProps) {
  const initial = new Date(value);

  const [viewYear,  setViewYear]  = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth()); // 0-11
  const [selDay,    setSelDay]    = useState(initial.getDate());
  const [selHour,   setSelHour]   = useState(initial.getHours());
  const [selMinute, setSelMinute] = useState(
    Math.round(initial.getMinutes() / 5) * 5 % 60,
  );

  // ── Calendar grid ────────────────────────────────────────────────────────────
  const daysInMonth  = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Mon=0
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // If day is out of range after month switch, clamp it
  const handleDaySelect = (d: number) => {
    setSelDay(d);
  };

  const handleConfirm = () => {
    const clamped = Math.min(selDay, daysInMonth);
    const d = new Date(viewYear, viewMonth, clamped, selHour, selMinute, 0, 0);
    onConfirm(d.toISOString());
  };

  const previewDate = new Date(
    viewYear, viewMonth, Math.min(selDay, daysInMonth), selHour, selMinute,
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 animate-fade-in"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Seleccionar fecha y hora"
        className={cn(
          'fixed inset-x-0 bottom-0 z-[51] flex max-h-[92dvh] flex-col rounded-t-2xl bg-background shadow-card-lg animate-fade-in',
          'md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-[400px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-h-[88vh]',
        )}
      >
        {/* Drag handle — mobile only */}
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25 md:hidden" />

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-4 py-3">
          <h2 className="text-sm font-bold text-foreground">Editar horario</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 grid gap-5">

          {/* ── Calendar ── */}
          <section>
            {/* Month navigation */}
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Mes anterior"
                className="rounded-lg p-1.5 text-foreground transition-colors hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>
              <span className="text-sm font-bold capitalize text-foreground">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Mes siguiente"
                className="rounded-lg p-1.5 text-foreground transition-colors hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Weekday headers */}
            <div className="mb-1 grid grid-cols-7">
              {WEEKDAYS.map((wd) => (
                <div
                  key={wd}
                  className="py-1 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((cellDay, idx) => {
                if (cellDay === null) return <div key={idx} aria-hidden="true" />;
                const isSelected =
                  cellDay === selDay &&
                  viewMonth === initial.getMonth() && viewYear === initial.getFullYear()
                    ? true
                    : cellDay === selDay;
                const isToday =
                  cellDay === today.getDate() &&
                  viewMonth === today.getMonth() &&
                  viewYear === today.getFullYear();
                return (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`${cellDay} de ${MONTHS[viewMonth]}`}
                    aria-pressed={isSelected}
                    onClick={() => handleDaySelect(cellDay)}
                    className={cn(
                      'h-9 w-full rounded-lg text-sm font-medium transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isSelected && 'bg-primary text-primary-foreground shadow-sm',
                      !isSelected && isToday && 'border border-primary/50 text-primary',
                      !isSelected && !isToday && 'text-foreground hover:bg-muted',
                    )}
                  >
                    {cellDay}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ── Hour selector ── */}
          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Hora
            </p>
            <div className="grid grid-cols-6 gap-1">
              {Array.from({ length: 24 }, (_, h) => (
                <button
                  key={h}
                  type="button"
                  aria-label={`${String(h).padStart(2, '0')}:00`}
                  aria-pressed={selHour === h}
                  onClick={() => setSelHour(h)}
                  className={cn(
                    'rounded-lg py-2 text-xs font-semibold tabular-nums transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selHour === h
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  {String(h).padStart(2, '0')}
                </button>
              ))}
            </div>
          </section>

          {/* ── Minute selector ── */}
          <section>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
              Minutos
            </p>
            <div className="grid grid-cols-6 gap-1">
              {MINUTE_OPTIONS.map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-label={`${String(m).padStart(2, '0')} minutos`}
                  aria-pressed={selMinute === m}
                  onClick={() => setSelMinute(m)}
                  className={cn(
                    'rounded-lg py-2 text-xs font-semibold tabular-nums transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    selMinute === m
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  {String(m).padStart(2, '0')}
                </button>
              ))}
            </div>
          </section>
        </div>

        {/* Footer — preview + confirm */}
        <div className="shrink-0 border-t border-border/60 px-4 py-3 grid gap-2">
          <p className="text-center text-xs font-medium text-muted-foreground">
            <span className="capitalize">
              {previewDate.toLocaleDateString('es-CO', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </span>
            {' · '}
            <span className="font-bold text-foreground tabular-nums">
              {String(selHour).padStart(2, '0')}:{String(selMinute).padStart(2, '0')}
            </span>
          </p>
          <Button
            className="w-full"
            onClick={handleConfirm}
            disabled={saving}
          >
            {saving ? 'Guardando...' : 'Confirmar horario'}
          </Button>
        </div>
      </div>
    </>
  );
}
