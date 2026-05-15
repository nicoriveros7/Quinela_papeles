'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Clock, Minus, Star, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { EntryBreakdownResponse, MatchBreakdown } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/state-panel';
import { TeamLabel } from '@/components/ui/team-label';

// ── Prediction status helpers ────────────────────────────────────────────────

type PredictionStatus = 'exacto' | 'resultado' | 'fallado' | 'pendiente' | 'sin-pick';

function getPredictionStatus(match: MatchBreakdown): PredictionStatus {
  if (match.predictedHomeScore === null) return 'sin-pick';
  if (match.status !== 'FINISHED') return 'pendiente';
  if ((match.breakdown?.exactScore ?? 0) > 0) return 'exacto';
  if (match.pointsAwarded > 0) return 'resultado';
  return 'fallado';
}

type StatusConfig = {
  label: string;
  chipClass: string;
  Icon: LucideIcon;
};

const STATUS_CONFIG: Record<PredictionStatus, StatusConfig> = {
  exacto:      { label: 'Exacto',    chipClass: 'bg-emerald-100 text-emerald-700', Icon: Star  },
  resultado:   { label: 'Resultado', chipClass: 'bg-amber-100 text-amber-700',     Icon: Check },
  fallado:     { label: 'Fallado',   chipClass: 'bg-rose-100 text-rose-600',       Icon: X     },
  pendiente:   { label: 'Pendiente', chipClass: 'bg-primary/10 text-primary',      Icon: Clock },
  'sin-pick':  { label: 'Sin pick',  chipClass: 'bg-muted text-muted-foreground',  Icon: Minus },
};

// ── Main component ───────────────────────────────────────────────────────────

interface ParticipantBreakdownSheetProps {
  poolId: string;
  entryId: string;
  token: string;
  onClose: () => void;
}

export function ParticipantBreakdownSheet({
  poolId,
  entryId,
  token,
  onClose,
}: ParticipantBreakdownSheetProps) {
  const [data, setData] = useState<EntryBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedMatches, setExpandedMatches] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getEntryBreakdown(poolId, entryId, token);
      setData(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar el detalle.');
    } finally {
      setLoading(false);
    }
  }, [poolId, entryId, token]);

  useEffect(() => { void load(); }, [load]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Focus panel on open
  useEffect(() => { panelRef.current?.focus(); }, []);

  const toggleMatch = (matchId: string) => {
    setExpandedMatches((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  return (
    <>
      {/* Backdrop — z-50 to cover bottom nav (z-40) and mobile header (z-40) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-50 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Panel — z-[51] sits one layer above the backdrop in the same stacking context */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Detalle de participante"
        tabIndex={-1}
        className={cn(
          // Base — mobile bottom sheet
          'fixed inset-x-0 bottom-0 z-[51] flex max-h-[90dvh] flex-col rounded-t-2xl bg-background shadow-card-lg outline-none animate-fade-in',
          // Desktop — centered modal
          'md:inset-auto md:left-1/2 md:top-1/2 md:w-full md:max-w-[640px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl md:max-h-[80vh]',
        )}
      >
        {/* Drag handle — mobile only */}
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25 md:hidden" />

        {/* Header */}
        <div className="flex shrink-0 items-start gap-3 border-b border-border/60 px-4 pb-3 pt-3 md:pt-5">
          <div className="min-w-0 flex-1">
            {loading ? (
              <div className="grid gap-2">
                <Skeleton className="h-5 w-40 rounded-md" />
                <Skeleton className="h-4 w-28 rounded-md" />
              </div>
            ) : (
              <>
                <h2 className="truncate text-base font-bold text-foreground">
                  {data?.displayName ?? '—'}
                </h2>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  {data?.rank != null && (
                    <span className="text-xs font-medium text-muted-foreground">
                      Ranking #{data.rank}
                    </span>
                  )}
                  <Badge variant="success" className="tabular-nums">
                    {data?.totalPoints ?? 0} pts totales
                  </Badge>
                  {data?.participantName &&
                    data.participantName !== data.displayName &&
                    !data.participantName.startsWith('#') && (
                    <span className="truncate text-xs text-muted-foreground">
                      {data.participantName}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
          {loading && <BreakdownSkeleton />}

          {!loading && error && (
            <div className="py-10 text-center">
              <p className="text-sm text-rose-600">{error}</p>
              <button
                type="button"
                className="mt-3 text-xs text-primary underline-offset-2 hover:underline"
                onClick={() => void load()}
              >
                Reintentar
              </button>
            </div>
          )}

          {!loading && !error && data && (
            <div className="grid gap-5 animate-fade-in">
              {/* Summary pills */}
              <SummarySection summary={data.summary} />

              {/* Match predictions */}
              {data.matchPredictions.length > 0 && (
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    Predicciones de partidos
                  </h3>
                  <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
                    {data.matchPredictions.map((match) => (
                      <MatchRow
                        key={match.matchId}
                        match={match}
                        expanded={expandedMatches.has(match.matchId)}
                        onToggle={() => toggleMatch(match.matchId)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* Tournament prediction */}
              {data.tournamentPrediction && (
                <TournamentSection prediction={data.tournamentPrediction} />
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function BreakdownSkeleton() {
  return (
    <div className="grid gap-4 animate-fade-in">
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-16 rounded-xl" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}

function SummarySection({ summary }: { summary: EntryBreakdownResponse['summary'] }) {
  const pills = [
    { label: 'Partidos', value: summary.matchPoints },
    { label: 'Bonus',    value: summary.bonusPoints },
    { label: 'Pre-torneo', value: summary.tournamentPoints },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {pills.map(({ label, value }) => (
        <div
          key={label}
          className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-surface/80 px-2 py-3 text-center"
        >
          <span className="tabular-nums text-xl font-extrabold text-foreground">{value}</span>
          <span className="mt-0.5 text-[11px] leading-none text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

function MatchRow({
  match,
  expanded,
  onToggle,
}: {
  match: MatchBreakdown;
  expanded: boolean;
  onToggle: () => void;
}) {
  const status = getPredictionStatus(match);
  const { label, chipClass, Icon } = STATUS_CONFIG[status];
  const hasPrediction = match.predictedHomeScore !== null;
  const hasQuestions = match.questions.length > 0;
  const isFinished = match.status === 'FINISHED';
  const isSinPick = status === 'sin-pick';

  const homeLabel = match.homeTeamName ?? match.homeSlotLabel ?? '?';
  const awayLabel = match.awayTeamName ?? match.awaySlotLabel ?? '?';

  return (
    <div className={cn('bg-background px-3 py-2.5', isSinPick && 'opacity-55')}>
      {/* Row: teams + score + status chip */}
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
          {match.homeTeamFlagEmoji && <span aria-hidden="true">{match.homeTeamFlagEmoji}</span>}{match.homeTeamFlagEmoji ? ' ' : ''}{homeLabel}
          <span className="mx-1 text-muted-foreground/50">vs</span>
          {match.awayTeamFlagEmoji && <span aria-hidden="true">{match.awayTeamFlagEmoji}</span>}{match.awayTeamFlagEmoji ? ' ' : ''}{awayLabel}
        </span>
        {isFinished && match.homeScore !== null && (
          <span className="shrink-0 tabular-nums text-sm font-bold text-foreground">
            {match.homeScore}–{match.awayScore}
          </span>
        )}
        <span
          className={cn(
            'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
            chipClass,
          )}
        >
          <Icon className="h-3 w-3" aria-hidden="true" />
          {label}
        </span>
      </div>

      {/* Prediction + pts */}
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground tabular-nums">
          {hasPrediction
            ? `Mi predicción: ${match.predictedHomeScore}–${match.predictedAwayScore}`
            : 'Sin predicción'}
        </span>
        {isFinished && hasPrediction && (
          <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
            +{match.pointsAwarded} pts
          </span>
        )}
      </div>

      {/* Bonus toggle */}
      {hasQuestions && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className="mt-1.5 flex min-h-[36px] items-center gap-1 text-xs font-medium text-primary"
        >
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
              expanded && 'rotate-180',
            )}
            aria-hidden="true"
          />
          {match.questions.length}{' '}
          {match.questions.length === 1 ? 'pregunta bonus' : 'preguntas bonus'}
        </button>
      )}

      {/* Bonus questions (collapsible) */}
      {hasQuestions && expanded && (
        <div className="mt-1 grid gap-2 rounded-lg bg-muted/50 p-2.5 animate-fade-in">
          {match.questions.map((q) => (
            <div key={q.questionId}>
              <p className="text-[11px] font-semibold leading-snug text-foreground">
                {q.questionText}
              </p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                <span>
                  Tu respuesta:{' '}
                  <span className="font-medium text-foreground">{q.answerLabel ?? '—'}</span>
                </span>
                {q.correctAnswerLabel && (
                  <span>
                    Correcto:{' '}
                    <span
                      className={cn(
                        'font-medium',
                        q.isCorrect === true && 'text-emerald-700',
                        q.isCorrect === false && 'text-rose-600',
                        q.isCorrect === null && 'text-foreground',
                      )}
                    >
                      {q.correctAnswerLabel}
                    </span>
                  </span>
                )}
                <span className="font-medium text-foreground tabular-nums">
                  +{q.pointsAwarded} pts
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TournamentSection({
  prediction,
}: {
  prediction: NonNullable<EntryBreakdownResponse['tournamentPrediction']>;
}) {
  const items = [
    { label: 'Campeón',    value: prediction.champion,  flagEmoji: prediction.championFlagEmoji, code: prediction.championCode },
    { label: 'Subcampeón', value: prediction.runnerUp,  flagEmoji: prediction.runnerUpFlagEmoji,  code: prediction.runnerUpCode },
    { label: 'Goleador',   value: prediction.topScorer, flagEmoji: null,                           code: null },
  ].filter((item): item is { label: string; value: string; flagEmoji: string | null; code: string | null } => item.value !== null);

  if (items.length === 0) return null;

  return (
    <section>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Pre-torneo
      </h3>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-surface/80">
        {items.map(({ label, value, flagEmoji, code }) => (
          <div
            key={label}
            className="flex items-center justify-between gap-2 border-b border-border/50 px-4 py-3 last:border-0"
          >
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            {flagEmoji || code ? (
              <TeamLabel
                name={value}
                code={code ?? undefined}
                flagEmoji={flagEmoji ?? undefined}
                format="full"
                className="text-sm font-semibold text-foreground"
              />
            ) : (
              <span className="text-sm font-semibold text-foreground">{value}</span>
            )}
          </div>
        ))}
        {prediction.isScored && (
          <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
            <span className="text-xs text-muted-foreground">Puntos ganados</span>
            <Badge variant="success" className="tabular-nums">
              +{prediction.pointsAwarded} pts
            </Badge>
          </div>
        )}
      </div>
    </section>
  );
}
