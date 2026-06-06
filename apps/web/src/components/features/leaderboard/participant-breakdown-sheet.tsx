'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Clock, Lock, Minus, Star, X, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { EntryBreakdownResponse, MatchBreakdown } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/state-panel';
import { TeamLabel } from '@/components/ui/team-label';

// ── Prediction status helpers ────────────────────────────────────────────────

type PredictionStatus = 'exacto' | 'resultado' | 'fallado' | 'pendiente' | 'sin-pick' | 'oculto';

function getPredictionStatus(match: MatchBreakdown): PredictionStatus {
  if (match.visibility === 'HIDDEN_UNTIL_LOCKED') return 'oculto';
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
  exacto:      { label: 'Exacto',    chipClass: 'bg-emerald-500/15 text-emerald-300',  Icon: Star  },
  resultado:   { label: 'Resultado', chipClass: 'bg-muted text-muted-foreground',      Icon: Check },
  fallado:     { label: 'Fallado',   chipClass: 'bg-rose-500/15 text-rose-300',        Icon: X     },
  pendiente:   { label: 'Pendiente', chipClass: 'bg-primary/10 text-primary',          Icon: Clock },
  'sin-pick':  { label: 'Sin pick',  chipClass: 'bg-muted text-muted-foreground',      Icon: Minus },
  oculto:      { label: 'Oculto',    chipClass: 'bg-amber-500/15 text-amber-400',      Icon: Lock  },
};

// ── Filter types and helpers ──────────────────────────────────────────────────

type PredictionFilter = 'all' | 'with-pick' | 'no-pick' | 'with-points';
type PhaseFilter = 'all' | 'groups' | 'knockout' | 'finished';

const PREDICTION_FILTERS: { value: PredictionFilter; label: string }[] = [
  { value: 'all',         label: 'Todos'      },
  { value: 'with-pick',   label: 'Con pick'   },
  { value: 'no-pick',     label: 'Sin pick'   },
  { value: 'with-points', label: 'Con puntos' },
];

const PHASE_FILTERS: { value: PhaseFilter; label: string }[] = [
  { value: 'all',      label: 'Todos'          },
  { value: 'groups',   label: 'Grupos'         },
  { value: 'knockout', label: 'Eliminatorias'  },
  { value: 'finished', label: 'Finalizados'    },
];

function filterMatches(
  matches: MatchBreakdown[],
  predFilter: PredictionFilter,
  phaseFilter: PhaseFilter,
): MatchBreakdown[] {
  return matches.filter((match) => {
    // ── Prediction filter ──
    const hasPick   = match.predictedHomeScore !== null;
    const hasPoints =
      match.pointsAwarded > 0 ||
      match.questions.some((q) => q.pointsAwarded > 0);

    if (predFilter === 'with-pick'   && !hasPick)   return false;
    if (predFilter === 'no-pick'     && hasPick)    return false;
    if (predFilter === 'with-points' && !hasPoints) return false;

    // ── Phase filter ──
    if (phaseFilter === 'groups'   && match.stage !== 'GROUP')    return false;
    if (phaseFilter === 'knockout' && match.stage === 'GROUP')    return false;
    if (phaseFilter === 'finished' && match.status !== 'FINISHED') return false;

    return true;
  });
}

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

  // ── Filter state ──
  const [predFilter, setPredFilter] = useState<PredictionFilter>('all');
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all');

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

  // ── Filtered matches ──
  const filteredMatches = useMemo(
    () =>
      data
        ? filterMatches(data.matchPredictions, predFilter, phaseFilter)
        : [],
    [data, predFilter, phaseFilter],
  );

  const hasActiveFilter = predFilter !== 'all' || phaseFilter !== 'all';

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

        {/* ── Filter bar — sticky below header, above scroll area ── */}
        {!loading && !error && data && data.matchPredictions.length > 0 && (
          <FilterBar
            predFilter={predFilter}
            phaseFilter={phaseFilter}
            count={filteredMatches.length}
            onPredFilter={setPredFilter}
            onPhaseFilter={setPhaseFilter}
          />
        )}

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
          {loading && <BreakdownSkeleton />}

          {!loading && error && (
            <div className="py-10 text-center">
              <p className="text-sm text-rose-400">{error}</p>
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
                  {data.matchPredictions.some((m) => m.visibility === 'HIDDEN_UNTIL_LOCKED') && (
                    <p className="mb-2 flex items-center gap-1.5 text-[11px] text-amber-400/80">
                      <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                      Algunas predicciones se revelarán cuando cierre cada partido
                    </p>
                  )}

                  {filteredMatches.length === 0 ? (
                    <EmptyFilterState onReset={() => { setPredFilter('all'); setPhaseFilter('all'); }} hasActiveFilter={hasActiveFilter} />
                  ) : (
                    <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
                      {filteredMatches.map((match) => (
                        <MatchRow
                          key={match.matchId}
                          match={match}
                          expanded={expandedMatches.has(match.matchId)}
                          onToggle={() => toggleMatch(match.matchId)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Tournament prediction */}
              {data.tournamentPrediction ? (
                <TournamentSection prediction={data.tournamentPrediction} />
              ) : data.tournamentPredictionHidden ? (
                <section>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    Pre-torneo
                  </h3>
                  <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                    <Lock className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                    <p className="text-xs text-amber-300/80">
                      Las predicciones pre-torneo se revelan cuando empiece el primer partido
                    </p>
                  </div>
                </section>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── FilterBar ────────────────────────────────────────────────────────────────

function FilterBar({
  predFilter,
  phaseFilter,
  count,
  onPredFilter,
  onPhaseFilter,
}: {
  predFilter: PredictionFilter;
  phaseFilter: PhaseFilter;
  count: number;
  onPredFilter: (v: PredictionFilter) => void;
  onPhaseFilter: (v: PhaseFilter) => void;
}) {
  return (
    <div className="shrink-0 border-b border-border/60 px-4 py-2.5 space-y-2">
      {/* Row 1: Prediction filter */}
      <div
        role="tablist"
        aria-label="Filtrar por estado de predicción"
        className="flex gap-1 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {PREDICTION_FILTERS.map(({ value, label }) => (
          <FilterPill
            key={value}
            label={label}
            active={predFilter === value}
            onClick={() => onPredFilter(value)}
          />
        ))}
      </div>

      {/* Row 2: Phase filter */}
      <div
        role="tablist"
        aria-label="Filtrar por fase"
        className="flex gap-1 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {PHASE_FILTERS.map(({ value, label }) => (
          <FilterPill
            key={value}
            label={label}
            active={phaseFilter === value}
            onClick={() => onPhaseFilter(value)}
          />
        ))}
      </div>

      {/* Counter */}
      <p className="text-[11px] font-medium text-muted-foreground">
        {count} {count === 1 ? 'partido' : 'partidos'}
      </p>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      role="tab"
      type="button"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

// ── EmptyFilterState ─────────────────────────────────────────────────────────

function EmptyFilterState({
  onReset,
  hasActiveFilter,
}: {
  onReset: () => void;
  hasActiveFilter: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-muted/30 px-4 py-8 text-center">
      <p className="text-sm font-medium text-muted-foreground">
        No hay partidos para este filtro.
      </p>
      {hasActiveFilter && (
        <button
          type="button"
          onClick={onReset}
          className="mt-3 text-xs font-semibold text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
        >
          Quitar filtros
        </button>
      )}
    </div>
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
    <div className="grid gap-2">
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
      {summary.jokerPoints > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2">
          <Zap className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          <span className="text-xs text-amber-300">
            Puntos extra por Joker x2:
          </span>
          <span className="ml-auto tabular-nums text-sm font-extrabold text-amber-300">
            +{summary.jokerPoints}
          </span>
        </div>
      )}
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
  const isHidden = match.visibility === 'HIDDEN_UNTIL_LOCKED';
  const hasBreakdown = isFinished && hasPrediction && match.breakdown !== null;
  const hasExpandable = hasBreakdown || hasQuestions;

  const homeLabel = match.homeTeamName ?? match.homeSlotLabel ?? '?';
  const awayLabel = match.awayTeamName ?? match.awaySlotLabel ?? '?';

  // Derive expand button label
  const expandLabel = (() => {
    if (hasBreakdown && hasQuestions)
      return `Desglose · ${match.questions.length} bonus`;
    if (hasBreakdown)
      return 'Ver desglose';
    return `${match.questions.length} ${match.questions.length === 1 ? 'pregunta bonus' : 'preguntas bonus'}`;
  })();

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
        {match.isJoker && (
          <span
            aria-label="Joker x2"
            className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-400"
          >
            <Zap className="h-2.5 w-2.5" aria-hidden="true" />x2
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

      {/* Hidden prediction placeholder */}
      {isHidden ? (
        <p className="mt-1 text-xs text-muted-foreground/70 italic">
          Disponible cuando cierren las predicciones
        </p>
      ) : (
        <>
          {/* Prediction + pts */}
          <div className="mt-0.5 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">
              {hasPrediction
                ? `Predicción: ${match.predictedHomeScore}–${match.predictedAwayScore}`
                : 'Sin predicción'}
            </span>
            {isFinished && hasPrediction && (() => {
              const bonusBase = match.questions.reduce((sum, q) => sum + q.pointsAwarded, 0);
              const totalWithJoker = match.pointsAwarded + bonusBase + match.jokerBonusPoints;
              return match.isJoker && match.jokerBonusPoints > 0 ? (
                <span className="shrink-0 tabular-nums text-xs font-bold text-amber-300">
                  {totalWithJoker} pts <span className="text-amber-400/60 text-[10px] font-semibold">(×2)</span>
                </span>
              ) : (
                <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">
                  +{match.pointsAwarded} pts
                </span>
              );
            })()}
          </div>

          {/* Expand toggle */}
          {hasExpandable && (
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
              {expandLabel}
            </button>
          )}

          {/* Expanded detail */}
          {hasExpandable && expanded && (
            <div className="mb-1 mt-1 grid gap-3 animate-fade-in">
              {/* Score breakdown */}
              {hasBreakdown && (
                <ScoreBreakdown breakdown={match.breakdown!} />
              )}

              {/* Joker breakdown */}
              {match.isJoker && match.jokerBonusPoints > 0 && (() => {
                const bonusBase = match.questions.reduce((sum, q) => sum + q.pointsAwarded, 0);
                const matchBase = match.pointsAwarded;
                const subtotal = matchBase + bonusBase;
                const jokerExtra = match.jokerBonusPoints;
                return (
                  <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-2.5">
                    {/* Header */}
                    <div className="mb-2 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-amber-400/80">
                        Joker ×2 aplicado
                      </span>
                    </div>

                    {/* Base rows */}
                    <div className="grid gap-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-amber-300/70">Puntos partido</span>
                        <span className="tabular-nums font-semibold text-amber-300">+{matchBase}</span>
                      </div>
                      {bonusBase > 0 && (
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-amber-300/70">Puntos bonus</span>
                          <span className="tabular-nums font-semibold text-amber-300">+{bonusBase}</span>
                        </div>
                      )}

                      {/* Formula divider */}
                      <div className="my-1 border-t border-amber-400/20" />

                      {/* Formula row */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-amber-300/60">
                          {subtotal} × 2 = {subtotal * 2} pts totales
                        </span>
                        <span className="tabular-nums font-bold text-amber-300">+{jokerExtra} extra</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Bonus questions */}
              {hasQuestions && (
                <div className="grid gap-2 rounded-lg bg-muted/50 p-2.5">
                  {hasBreakdown && (
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
                      Preguntas bonus
                    </p>
                  )}
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
                                q.isCorrect === true && 'text-emerald-300',
                                q.isCorrect === false && 'text-rose-400',
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
          )}
        </>
      )}
    </div>
  );
}

// ── ScoreBreakdown ────────────────────────────────────────────────────────────

import type { MatchPredictionBreakdown } from '@/types/api';

const SCORE_CATEGORIES: { key: keyof Omit<MatchPredictionBreakdown, 'totalPoints'>; label: string }[] = [
  { key: 'exactScore',     label: 'Marcador exacto'  },
  { key: 'winner',         label: 'Equipo ganador'   },
  { key: 'loser',          label: 'Equipo perdedor'  },
  { key: 'goalDifference', label: 'Dif. de goles'    },
  { key: 'homeGoals',      label: 'Goles local'      },
  { key: 'awayGoals',      label: 'Goles visita'     },
  { key: 'totalGoals',     label: 'Total de goles'   },
];

function ScoreBreakdown({ breakdown }: { breakdown: MatchPredictionBreakdown }) {
  const rows = SCORE_CATEGORIES;

  return (
    <div className="rounded-lg bg-muted/50 p-2.5">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Puntos del partido
      </p>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {rows.map(({ key, label }) => {
          const pts = breakdown[key];
          const earned = pts > 0;
          return (
            <div
              key={key}
              className={cn(
                'flex items-center justify-between gap-1 rounded-md px-2.5 py-1.5',
                earned ? 'bg-emerald-500/10' : 'bg-background/60',
              )}
            >
              <span
                className={cn(
                  'truncate text-[11px]',
                  earned ? 'text-emerald-300' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
              <span
                className={cn(
                  'shrink-0 text-[11px] font-bold tabular-nums',
                  earned ? 'text-emerald-300' : 'text-muted-foreground/50',
                )}
              >
                {earned ? `+${pts}` : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── TournamentSection ────────────────────────────────────────────────────────

import type { TournamentFieldScore } from '@/types/api';

function FieldScoreBadge({ score }: { score: TournamentFieldScore | undefined }) {
  if (!score) return null;
  if (score.isCorrect === true)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300 tabular-nums">
        <Check className="h-3 w-3" aria-hidden="true" />
        +{score.points}
      </span>
    );
  if (score.isCorrect === false)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-400 tabular-nums">
        <X className="h-3 w-3" aria-hidden="true" />0
      </span>
    );
  return null; // actual result not set yet
}

function TournamentSection({
  prediction,
}: {
  prediction: NonNullable<EntryBreakdownResponse['tournamentPrediction']>;
}) {
  const fb = prediction.fieldBreakdown;

  const teamItems = [
    { key: 'champion'   as const, label: 'Campeón',       value: prediction.champion,    flagEmoji: prediction.championFlagEmoji,    code: prediction.championCode },
    { key: 'runnerUp'   as const, label: 'Subcampeón',    value: prediction.runnerUp,    flagEmoji: prediction.runnerUpFlagEmoji,    code: prediction.runnerUpCode },
    { key: 'thirdPlace' as const, label: 'Tercer puesto', value: prediction.thirdPlace,  flagEmoji: prediction.thirdPlaceFlagEmoji,  code: prediction.thirdPlaceCode },
  ];

  const playerItems = [
    { key: 'topScorer'  as const, label: 'Goleador',      value: prediction.topScorer  },
    { key: 'goldenBall' as const, label: 'Mejor jugador', value: prediction.goldenBall },
    { key: 'goldenGlove'as const, label: 'Mejor arquero', value: prediction.goldenGlove },
  ];

  const hasBestThirds = prediction.bestThirds && prediction.bestThirds.length > 0;
  const hasAnyPick = teamItems.some((i) => i.value) || playerItems.some((i) => i.value) || hasBestThirds;

  if (!hasAnyPick) return null;

  return (
    <section>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
        Pre-torneo
      </h3>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-surface/80">
        {/* Team picks */}
        {teamItems.map(({ key, label, value, flagEmoji, code }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-2.5 last:border-0"
          >
            <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
            <div className="flex min-w-0 items-center gap-2">
              {value ? (
                flagEmoji || code ? (
                  <TeamLabel
                    name={value}
                    code={code ?? undefined}
                    flagEmoji={flagEmoji ?? undefined}
                    format="full"
                    className="text-sm font-semibold text-foreground"
                  />
                ) : (
                  <span className="text-sm font-semibold text-foreground">{value}</span>
                )
              ) : (
                <span className="text-xs italic text-muted-foreground">Sin pick</span>
              )}
              <FieldScoreBadge score={fb?.[key]} />
            </div>
          </div>
        ))}

        {/* Player picks */}
        {playerItems.map(({ key, label, value }) => (
          <div
            key={key}
            className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-2.5 last:border-0"
          >
            <span className="shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
            <div className="flex min-w-0 items-center gap-2">
              {value ? (
                <span className="truncate text-sm font-semibold text-foreground">{value}</span>
              ) : (
                <span className="text-xs italic text-muted-foreground">Sin pick</span>
              )}
              <FieldScoreBadge score={fb?.[key]} />
            </div>
          </div>
        ))}

        {/* Best thirds */}
        <div className="border-b border-border/50 px-4 py-3 last:border-0">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">
              Mejores terceros{' '}
              {fb?.bestThirds.total
                ? `(${fb.bestThirds.hits}/${fb.bestThirds.total} acertados)`
                : `(${prediction.bestThirds?.length ?? 0}/8)`}
            </p>
            <FieldScoreBadge score={fb?.bestThirds} />
          </div>
          {hasBestThirds ? (
            <div className="flex flex-wrap gap-1.5">
              {prediction.bestThirds!.map((team) => (
                <span
                  key={team.code}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                >
                  {team.flagEmoji && <span aria-hidden="true">{team.flagEmoji}</span>}
                  {team.name}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-xs italic text-muted-foreground">Sin pick</span>
          )}
        </div>

        {/* Total */}
        {prediction.isScored && (
          <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
            <span className="text-xs text-muted-foreground">Total pre-torneo</span>
            <Badge variant="success" className="tabular-nums">
              +{prediction.pointsAwarded} pts
            </Badge>
          </div>
        )}
      </div>
    </section>
  );
}
