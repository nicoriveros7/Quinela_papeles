'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Lock, Save, Search } from 'lucide-react';

import { cn, normalizeSearchText } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { formatMatchKickoff, matchStatusLabel, questionTypeLabel } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { MatchPredictionsBundle, MatchQuestionOption, PoolDetail, PoolMatch, PoolMatchesResponse, PoolMatchQuestion } from '@/types/api';
import { PoolContextTabs } from '@/components/layout/pool-context-tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SaveFeedback } from '@/components/ui/save-feedback';
import { ScoreInput } from '@/components/ui/score-input';
import { SkeletonCard, StatePanel } from '@/components/ui/state-panel';
import { TeamLabel } from '@/components/ui/team-label';

// ── Types ─────────────────────────────────────────────────────────────────────

type QuestionDraft = {
  selectedOptionId?: string;
  selectedBoolean?: boolean;
  selectedTeamId?: string;
  selectedPlayerId?: string;
  selectedTimeRangeKey?: string;
};

type PredictionSummary = {
  hasMatchPrediction: boolean;
  questionsDone: number;
  questionsTotal: number;
  isComplete: boolean;
};

type PhaseFilter = 'GROUP' | 'KNOCKOUT';

// ── Constants ─────────────────────────────────────────────────────────────────

const GROUP_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;
const KNOCKOUT_STAGES = [
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE',
  'FINAL',
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStageLabel(stage: string) {
  switch (stage) {
    case 'ROUND_OF_32': return 'R32';
    case 'ROUND_OF_16': return 'R16';
    case 'QUARTER_FINAL': return 'QF';
    case 'SEMI_FINAL': return 'SF';
    case 'THIRD_PLACE': return '3P';
    case 'FINAL': return 'Final';
    default: return stage;
  }
}

function getMatchCodeLabel(match: PoolMatch, side: 'home' | 'away') {
  if (side === 'home') {
    return match.homeTournamentTeam?.team.code ?? match.homeSlotLabel ?? 'TBD';
  }
  return match.awayTournamentTeam?.team.code ?? match.awaySlotLabel ?? 'TBD';
}

function getMatchNameLabel(match: PoolMatch, side: 'home' | 'away') {
  if (side === 'home') {
    return match.homeTournamentTeam?.team.name ?? match.homeSlotLabel ?? 'TBD';
  }
  return match.awayTournamentTeam?.team.name ?? match.awaySlotLabel ?? 'TBD';
}

function getMatchFlagEmoji(match: PoolMatch, side: 'home' | 'away'): string | null | undefined {
  return side === 'home'
    ? match.homeTournamentTeam?.team.flagEmoji
    : match.awayTournamentTeam?.team.flagEmoji;
}

/** Returns the CSS classes for a match picker card based on its state. */
function matchCardStateClass(
  match: PoolMatch,
  summary: PredictionSummary | undefined,
  isSelected: boolean,
): string {
  if (isSelected) {
    return 'border-primary bg-primary/10 ring-1 ring-primary/20 shadow-card-sm';
  }
  if (match.status === 'LIVE') {
    return 'border-rose-400/30 bg-rose-500/10';
  }
  if (summary?.isComplete) {
    return 'border-emerald-400/30 bg-emerald-500/10';
  }
  if (match.status === 'SCHEDULED' && summary !== undefined) {
    return 'border-primary/20 bg-primary/8';
  }
  if (match.status === 'FINISHED') {
    return 'border-border/40 bg-muted/50';
  }
  return 'border-border/60 bg-background/70 hover:border-primary/20';
}

// ── Lock helpers ─────────────────────────────────────────────────────────────

function computeLockAt(kickoffAt: string, lockMinutes: number): Date {
  return new Date(new Date(kickoffAt).getTime() - lockMinutes * 60_000);
}

function isMatchLocked(kickoffAt: string, lockMinutes: number): boolean {
  return Date.now() >= computeLockAt(kickoffAt, lockMinutes).getTime();
}

function isQuestionLocked(question: Pick<PoolMatchQuestion, 'lockAt'>): boolean {
  return question.lockAt !== null && Date.now() >= new Date(question.lockAt).getTime();
}

// ── Page ──────────────────────────────────────────────────────────────────────

function EntryPredictionsPage() {
  const params = useParams<{ poolId: string; entryId: string }>();
  const poolId = params.poolId;
  const entryId = params.entryId;

  const { token, user } = useAuth();
  const isAdmin = user?.systemRole === 'ADMIN' || user?.systemRole === 'SUPER_ADMIN';

  const searchParams = useSearchParams();
  const initialMatchId = searchParams.get('matchId');
  const hasScrolledToInitialRef = useRef(false);

  const [pool, setPool] = useState<PoolDetail | null>(null);
  const [matches, setMatches] = useState<PoolMatch[]>([]);
  const [isOwner, setIsOwner] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<MatchPredictionsBundle | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, QuestionDraft>>({});
  const [predictionSummaryByMatch, setPredictionSummaryByMatch] = useState<Record<string, PredictionSummary>>({});

  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('GROUP');
  const [groupFilter, setGroupFilter] = useState<string>('ALL');
  const [knockoutRoundFilter, setKnockoutRoundFilter] = useState<string>('ALL');
  const [pendingOnly, setPendingOnly] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [bundleLoading, setBundleLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) ?? null,
    [matches, selectedMatchId],
  );

  // True when the selected match can no longer accept predictions:
  // either the status is not SCHEDULED, or the lockMinutesBeforeKickoff window has passed.
  const isSelectedMatchLocked =
    selectedMatch !== null &&
    pool !== null &&
    (selectedMatch.status !== 'SCHEDULED' ||
      isMatchLocked(selectedMatch.kickoffAt, pool.lockMinutesBeforeKickoff));

  const questionPredictionById = useMemo(() => {
    const rows = bundle?.questionPredictions ?? [];
    return new Map(rows.map((row) => [row.matchQuestionId, row]));
  }, [bundle?.questionPredictions]);

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [poolData, matchesData, myEntries] = await Promise.all([
          api.getPool(poolId, token),
          api.listPoolMatches(poolId, token),
          api.listMyEntries(poolId, token),
        ]);

        setPool(poolData);
        const list = (matchesData as PoolMatchesResponse).matches;
        setMatches(list);
        const matchFromUrl = initialMatchId ? list.find((m) => m.id === initialMatchId) : null;
        if (matchFromUrl) {
          if (matchFromUrl.stage !== 'GROUP') setPhaseFilter('KNOCKOUT');
          setSelectedMatchId(matchFromUrl.id);
        } else {
          setSelectedMatchId(list[0]?.id ?? null);
        }
        setIsOwner(myEntries.some((entry) => entry.id === entryId));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la pantalla de predicciones.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [poolId, token, entryId, initialMatchId]);

  const visibleMatches = useMemo(() => {
    if (isOwner) return matches;
    return matches.filter((match) => match.status === 'FINISHED');
  }, [isOwner, matches]);

  useEffect(() => {
    if (!token || visibleMatches.length === 0) {
      setPredictionSummaryByMatch({});
      return;
    }

    let cancelled = false;
    const loadSummary = async () => {
      setLoadingSummary(true);
      const nextSummary: Record<string, PredictionSummary> = {};

      const results = await Promise.allSettled(
        visibleMatches.map(async (match) => {
          const data = await api.getEntryMatchPredictions(poolId, entryId, match.id, token);
          const predictedQuestionIds = new Set(data.questionPredictions.map((p) => p.matchQuestionId));
          const questionsTotal = data.questions.length;
          const questionsDone = data.questions.filter((q) => predictedQuestionIds.has(q.id)).length;
          const hasMatchPrediction = Boolean(data.matchPrediction);
          return {
            matchId: match.id,
            summary: {
              hasMatchPrediction,
              questionsDone,
              questionsTotal,
              isComplete: hasMatchPrediction && (questionsTotal === 0 || questionsDone === questionsTotal),
            },
          };
        }),
      );

      for (const result of results) {
        if (result.status === 'fulfilled') {
          nextSummary[result.value.matchId] = result.value.summary;
        }
      }

      if (!cancelled) {
        setPredictionSummaryByMatch(nextSummary);
        setLoadingSummary(false);
      }
    };

    void loadSummary();
    return () => { cancelled = true; };
  }, [token, visibleMatches, poolId, entryId]);

  useEffect(() => {
    if (!token || !selectedMatchId) return;

    const loadBundle = async () => {
      setBundleLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const data = await api.getEntryMatchPredictions(poolId, entryId, selectedMatchId, token);
        setBundle(data);
        setHomeScore(data.matchPrediction?.predictedHomeScore?.toString() ?? '');
        setAwayScore(data.matchPrediction?.predictedAwayScore?.toString() ?? '');

        const drafts: Record<string, QuestionDraft> = {};
        for (const prediction of data.questionPredictions) {
          drafts[prediction.matchQuestionId] = {
            selectedOptionId: prediction.selectedOptionId ?? undefined,
            selectedBoolean: prediction.selectedBoolean ?? undefined,
            selectedTeamId: prediction.selectedTeamId ?? undefined,
            selectedPlayerId: prediction.selectedPlayerId ?? undefined,
            selectedTimeRangeKey: prediction.selectedTimeRangeKey ?? undefined,
          };
        }
        setQuestionDrafts(drafts);
      } catch (err) {
        setBundle(null);
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar predicciones del partido.');
      } finally {
        setBundleLoading(false);
      }
    };

    void loadBundle();
  }, [entryId, poolId, selectedMatchId, token]);

  const filteredMatches = useMemo(() => {
    return visibleMatches.filter((match) => {
      const isGroup = match.stage === 'GROUP';
      if (phaseFilter === 'GROUP' && !isGroup) return false;
      if (phaseFilter === 'KNOCKOUT' && isGroup) return false;
      if (phaseFilter === 'GROUP' && groupFilter !== 'ALL' && match.group?.code !== groupFilter) return false;
      if (phaseFilter === 'KNOCKOUT' && knockoutRoundFilter !== 'ALL' && match.stage !== knockoutRoundFilter) return false;
      if (pendingOnly && isOwner) {
        const summary = predictionSummaryByMatch[match.id];
        if (summary?.isComplete) return false;
      }
      return true;
    });
  }, [visibleMatches, phaseFilter, groupFilter, knockoutRoundFilter, pendingOnly, predictionSummaryByMatch, isOwner]);

  useEffect(() => {
    if (filteredMatches.length === 0) return;
    const selectedStillVisible = filteredMatches.some((match) => match.id === selectedMatchId);
    if (!selectedStillVisible) {
      setSelectedMatchId(filteredMatches[0].id);
    }
  }, [filteredMatches, selectedMatchId]);

  const progress = useMemo(() => {
    const editableMatches = matches.filter((match) => match.status === 'SCHEDULED');
    const completeCount = editableMatches.reduce(
      (acc, match) => acc + (predictionSummaryByMatch[match.id]?.isComplete ? 1 : 0),
      0,
    );
    return {
      totalEditable: editableMatches.length,
      completeCount,
      percent: editableMatches.length > 0 ? Math.round((completeCount / editableMatches.length) * 100) : 0,
    };
  }, [matches, predictionSummaryByMatch]);

  // Index of selected match in the current filtered list — used for prev/next nav.
  const currentMatchIndex = useMemo(
    () => filteredMatches.findIndex((m) => m.id === selectedMatchId),
    [filteredMatches, selectedMatchId],
  );

  const jumpToNextPending = () => {
    if (filteredMatches.length === 0) return;
    const startIndex = Math.max(0, filteredMatches.findIndex((match) => match.id === selectedMatchId));
    for (let i = 1; i <= filteredMatches.length; i += 1) {
      const next = filteredMatches[(startIndex + i) % filteredMatches.length];
      const summary = predictionSummaryByMatch[next.id];
      if (!summary?.isComplete && next.status === 'SCHEDULED') {
        setSelectedMatchId(next.id);
        return;
      }
    }
  };

  useEffect(() => {
    if (hasScrolledToInitialRef.current || !initialMatchId) return;
    if (selectedMatchId !== initialMatchId) return;
    if (!filteredMatches.some((m) => m.id === initialMatchId)) return;
    requestAnimationFrame(() => {
      document.getElementById(`match-chip-${initialMatchId}`)?.scrollIntoView({
        behavior: 'smooth', inline: 'center', block: 'nearest',
      });
      hasScrolledToInitialRef.current = true;
    });
  }, [filteredMatches, selectedMatchId, initialMatchId]);

  const updateSummaryForMatch = (updated: MatchPredictionsBundle) => {
    const predictedQuestionIds = new Set(updated.questionPredictions.map((p) => p.matchQuestionId));
    const questionsTotal = updated.questions.length;
    const questionsDone = updated.questions.filter((q) => predictedQuestionIds.has(q.id)).length;
    setBundle(updated);
    setPredictionSummaryByMatch((prev) => ({
      ...prev,
      [updated.match.id]: {
        hasMatchPrediction: Boolean(updated.matchPrediction),
        questionsTotal,
        questionsDone,
        isComplete: Boolean(updated.matchPrediction) && (questionsTotal === 0 || questionsDone === questionsTotal),
      },
    }));
  };

  const buildQuestionPayload = (
    question: MatchPredictionsBundle['questions'][number],
    draft?: QuestionDraft,
  ) => {
    if (!draft) return null;
    switch (question.answerType) {
      case 'BOOLEAN':
        return typeof draft.selectedBoolean === 'boolean'
          ? { selectedBoolean: draft.selectedBoolean }
          : null;
      case 'TIME_RANGE':
        return draft.selectedTimeRangeKey ? { selectedTimeRangeKey: draft.selectedTimeRangeKey } : null;
      case 'TEAM_PICK':
        if (draft.selectedTeamId) return { selectedTeamId: draft.selectedTeamId };
        if (draft.selectedOptionId) return { selectedOptionId: draft.selectedOptionId };
        return null;
      case 'PLAYER_PICK':
        if (draft.selectedPlayerId) return { selectedPlayerId: draft.selectedPlayerId };
        if (draft.selectedOptionId) return { selectedOptionId: draft.selectedOptionId };
        return null;
      case 'SINGLE_CHOICE':
      default:
        return draft.selectedOptionId ? { selectedOptionId: draft.selectedOptionId } : null;
    }
  };

  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const saveAllPredictions = async () => {
    if (!token || !selectedMatchId) return;

    // Re-check lock at save time (user may have had the page open across the deadline)
    if (isSelectedMatchLocked) {
      setError('Las predicciones de este partido ya están cerradas.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const hasPartialScore = (homeScore === '') !== (awayScore === '');
    if (hasPartialScore) {
      setError('Completa el marcador local y visita antes de guardar.');
      setSaving(false);
      return;
    }

    const shouldSaveMatch = homeScore !== '' && awayScore !== '';
    const questionPayloads = (bundle?.questions ?? [])
      .filter((question) => !question.isResolved && !isQuestionLocked(question))
      .map((question) => ({
        questionId: question.id,
        payload: buildQuestionPayload(question, questionDrafts[question.id]),
      }))
      .filter((entry) => entry.payload !== null) as Array<{ questionId: string; payload: QuestionDraft }>;

    const questionsToSave = questionPayloads.map((entry) => entry.questionId);

    if (!shouldSaveMatch && questionsToSave.length === 0) {
      setError('No hay cambios para guardar en este partido.');
      setSaving(false);
      return;
    }

    try {
      const tasks: Promise<unknown>[] = [];
      if (shouldSaveMatch) {
        tasks.push(
          api.upsertMatchPrediction(poolId, entryId, selectedMatchId, Number(homeScore), Number(awayScore), token),
        );
      }
      for (const entry of questionPayloads) {
        tasks.push(api.upsertQuestionPrediction(poolId, entryId, entry.questionId, entry.payload, token));
      }
      await Promise.all(tasks);

      const updated = await api.getEntryMatchPredictions(poolId, entryId, selectedMatchId, token);
      updateSummaryForMatch(updated);

      if (shouldSaveMatch && questionsToSave.length > 0) {
        flashSuccess(`Marcador y ${questionsToSave.length} bonus guardados.`);
      } else if (shouldSaveMatch) {
        flashSuccess('Marcador guardado.');
      } else {
        flashSuccess(`${questionsToSave.length} bonus guardados.`);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : '';
      if (msg.toLowerCase().includes('locked')) {
        setError('Las predicciones de este partido ya están cerradas.');
      } else {
        setError(msg || 'No se pudieron guardar las predicciones.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <StatePanel variant="loading" description="Cargando partidos..." />;
  }

  // ── Derived nav values ─────────────────────────────────────────────────────
  const prevMatch = currentMatchIndex > 0 ? filteredMatches[currentMatchIndex - 1] : null;
  const nextMatch = currentMatchIndex < filteredMatches.length - 1 ? filteredMatches[currentMatchIndex + 1] : null;

  return (
    // pb-20 on mobile gives extra clearance above the sticky save bar + bottom nav.
    // pb-24 from <main> in auth-guard + pb-20 here = 224px total, well above the bar.
    <div className="grid gap-4 animate-fade-in pb-20 lg:pb-0">
      {isAdmin && <PoolContextTabs poolId={poolId} entryId={entryId} />}

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-border/70 bg-surface/90 p-4 shadow-card-sm">
        {/* Subtle premium glow */}
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 -z-10 h-full w-full opacity-40 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at top right, hsl(var(--primary) / 0.08), transparent 45%)',
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-foreground">Mis predicciones</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{pool?.name ?? '—'}</p>
          </div>
          {!isOwner ? <Badge variant="muted">Solo lectura</Badge> : null}
        </div>

        {isOwner ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Progreso: {progress.completeCount}/{progress.totalEditable} partidos completos ({progress.percent}%)
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={jumpToNextPending}
              disabled={filteredMatches.length === 0}
              className="sm:shrink-0"
            >
              Siguiente pendiente
            </Button>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted sm:col-span-2">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        ) : null}
      </header>

      {/* ── Phase + group filters ─────────────────────────────────────────────── */}
      <section className="grid gap-2 rounded-2xl border border-border/70 bg-surface/90 p-3 shadow-card-sm">
        <div role="tablist" aria-label="Fase del torneo" className="flex flex-wrap gap-1.5">
          {(['GROUP', 'KNOCKOUT'] as const).map((phase) => (
            <button
              key={phase}
              role="tab"
              aria-selected={phaseFilter === phase}
              onClick={() => setPhaseFilter(phase)}
              className={cn(
                'flex-1 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] sm:text-xs',
                'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                phaseFilter === phase
                  ? 'bg-primary text-primary-foreground shadow-card-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {phase === 'GROUP' ? 'Fase de grupos' : 'Eliminatorias'}
            </button>
          ))}
          {isOwner ? (
            <button
              onClick={() => setPendingOnly((prev) => !prev)}
              className={cn(
                'w-full rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] sm:w-auto sm:text-xs',
                'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                pendingOnly
                  ? 'border border-primary/30 bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              Solo pendientes
            </button>
          ) : null}
        </div>

        <div role="tablist" aria-label="Filtro de grupo o ronda" className="scrollbar-sport flex gap-1 overflow-x-auto">
          {phaseFilter === 'GROUP' ? (
            <>
              <FilterPill active={groupFilter === 'ALL'} onClick={() => setGroupFilter('ALL')}>Todos</FilterPill>
              {GROUP_CODES.map((code) => (
                <FilterPill key={code} active={groupFilter === code} onClick={() => setGroupFilter(code)}>
                  {code}
                </FilterPill>
              ))}
            </>
          ) : (
            <>
              <FilterPill active={knockoutRoundFilter === 'ALL'} onClick={() => setKnockoutRoundFilter('ALL')}>Todas</FilterPill>
              {KNOCKOUT_STAGES.map((stage) => (
                <FilterPill key={stage} active={knockoutRoundFilter === stage} onClick={() => setKnockoutRoundFilter(stage)}>
                  {getStageLabel(stage)}
                </FilterPill>
              ))}
            </>
          )}
        </div>

        {loadingSummary ? (
          <p className="text-[11px] text-muted-foreground">Actualizando estado de predicciones...</p>
        ) : null}
      </section>

      {/* ── Match picker — sticky on mobile ──────────────────────────────────────
          sticky top-14: sits just below the mobile sticky header (h-14 = 56px).
          lg:static: desktop has a sidebar layout, sticky is not needed there.    */}
      <section
        role="listbox"
        aria-label="Seleccionar partido"
        className={cn(
          'scrollbar-sport overflow-x-auto rounded-2xl border border-border/70 bg-surface/95 p-2 shadow-card backdrop-blur-sm',
          'sticky top-14 z-30',
          'lg:static lg:z-auto lg:bg-surface/90 lg:shadow-card-sm',
        )}
      >
        <div className="flex min-w-max gap-2">
          {filteredMatches.length === 0 ? (
            <StatePanel variant="empty" description="No hay partidos para los filtros seleccionados." compact />
          ) : (
            filteredMatches.map((match) => {
              const summary = predictionSummaryByMatch[match.id];
              const isSelected = selectedMatchId === match.id;
              const isLive = match.status === 'LIVE';
              const stageTag = match.stage === 'GROUP'
                ? `G-${match.group?.code ?? '?'}`
                : getStageLabel(match.stage);

              return (
                <button
                  key={match.id}
                  id={`match-chip-${match.id}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => setSelectedMatchId(match.id)}
                  className={cn(
                    'flex min-w-[160px] flex-col gap-1.5 rounded-xl border p-3 text-left',
                    'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    matchCardStateClass(match, summary, isSelected),
                  )}
                >
                  {/* Date — topmost, most visible */}
                  <time
                    dateTime={match.kickoffAt}
                    className={cn(
                      'flex items-center gap-1 text-[11px] font-semibold leading-none',
                      isSelected ? 'text-primary' : 'text-foreground',
                    )}
                  >
                    <CalendarDays className="h-3 w-3 shrink-0 opacity-70" aria-hidden="true" />
                    {formatMatchKickoff(match.kickoffAt)}
                  </time>

                  {/* Team codes + score */}
                  <div className="flex items-center justify-between gap-1">
                    <TeamLabel
                      name={getMatchNameLabel(match, 'home')}
                      code={getMatchCodeLabel(match, 'home')}
                      flagEmoji={getMatchFlagEmoji(match, 'home')}
                      format="compact"
                      className={cn('text-xs font-extrabold', isSelected ? 'text-primary' : 'text-foreground')}
                    />
                    {isLive || match.status === 'FINISHED' ? (
                      <span className="text-[10px] font-bold tabular-nums text-foreground">
                        {match.homeScore ?? 0}–{match.awayScore ?? 0}
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60">vs</span>
                    )}
                    <TeamLabel
                      name={getMatchNameLabel(match, 'away')}
                      code={getMatchCodeLabel(match, 'away')}
                      flagEmoji={getMatchFlagEmoji(match, 'away')}
                      format="compact"
                      className={cn('text-xs font-extrabold', isSelected ? 'text-primary' : 'text-foreground')}
                    />
                  </div>

                  {/* Status badge + completion dot */}
                  <div className="flex items-center gap-1.5">
                    <Badge variant={isLive ? 'live' : 'muted'} className="px-1.5 py-0 text-[9px]">
                      {isLive ? 'LIVE' : stageTag}
                    </Badge>
                    {summary?.isComplete ? (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-label="Completo" />
                    ) : summary !== undefined && !summary.isComplete ? (
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/60" aria-label="Pendiente" />
                    ) : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {/* ── Match detail ──────────────────────────────────────────────────────── */}
      {bundleLoading ? (
        <SkeletonCard />
      ) : selectedMatch ? (
        <div className="grid gap-3">

          {/* ── Match identity bar with prev/next navigation ── */}
          <div className="overflow-hidden rounded-2xl border border-border/70 bg-surface/90 shadow-card-sm">

            {/* Prev / match name / Next */}
            <div className="flex items-center gap-1 px-2 pt-3 pb-2.5">
              <button
                type="button"
                aria-label="Partido anterior"
                disabled={!prevMatch}
                onClick={() => prevMatch && setSelectedMatchId(prevMatch.id)}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  prevMatch ? 'hover:bg-muted text-foreground' : 'cursor-not-allowed text-muted-foreground/25',
                )}
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>

              <div className="min-w-0 flex-1 px-1 text-center">
                <p className="truncate text-sm font-extrabold text-foreground">
                  {getMatchNameLabel(selectedMatch, 'home')} vs {getMatchNameLabel(selectedMatch, 'away')}
                </p>
                <p className="mt-1 flex items-center justify-center gap-1.5">
                  <CalendarDays className="h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" />
                  <time dateTime={selectedMatch.kickoffAt} className="text-sm font-bold text-foreground">
                    {formatMatchKickoff(selectedMatch.kickoffAt)}
                  </time>
                  {filteredMatches.length > 1 && (
                    <span className="tabular-nums text-xs text-muted-foreground/50">
                      · {currentMatchIndex + 1}/{filteredMatches.length}
                    </span>
                  )}
                </p>
              </div>

              <button
                type="button"
                aria-label="Siguiente partido"
                disabled={!nextMatch}
                onClick={() => nextMatch && setSelectedMatchId(nextMatch.id)}
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  nextMatch ? 'hover:bg-muted text-foreground' : 'cursor-not-allowed text-muted-foreground/25',
                )}
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {/* Badges + "Siguiente pendiente" shortcut */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border/40 px-4 py-2.5">
              <Badge variant="muted">
                {selectedMatch.stage === 'GROUP'
                  ? `Grupo ${selectedMatch.group?.code ?? '?'}`
                  : getStageLabel(selectedMatch.stage)}
              </Badge>
              <Badge
                variant={
                  selectedMatch.status === 'LIVE'
                    ? 'live'
                    : selectedMatch.status === 'FINISHED'
                    ? 'muted'
                    : 'default'
                }
              >
                {matchStatusLabel(selectedMatch.status)}
              </Badge>
              {isOwner ? (
                <button
                  type="button"
                  onClick={jumpToNextPending}
                  className="ml-auto text-[11px] font-semibold text-primary transition-colors hover:text-primary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                >
                  Sig. pendiente →
                </button>
              ) : null}
            </div>
          </div>

          {/* ── Locked banner ── */}
          {isOwner && isSelectedMatchLocked ? (
            <LockedMatchBanner
              kickoffAt={selectedMatch.kickoffAt}
              status={selectedMatch.status}
              lockAt={pool ? computeLockAt(selectedMatch.kickoffAt, pool.lockMinutesBeforeKickoff) : null}
            />
          ) : null}

          {/* ── Score prediction ── */}
          <section className="rounded-2xl border border-border/70 bg-surface/90 p-4 shadow-card-sm">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Predicción del marcador
            </p>

            <div className="grid grid-cols-2 gap-4">
              {/* Home */}
              <div className="flex flex-col items-center gap-2">
                <TeamLabel
                  name={getMatchNameLabel(selectedMatch, 'home')}
                  code={getMatchCodeLabel(selectedMatch, 'home')}
                  flagEmoji={getMatchFlagEmoji(selectedMatch, 'home')}
                  format="compact"
                  className="text-base font-extrabold leading-none text-foreground"
                />
                <span className="max-w-[80px] truncate text-center text-[11px] text-muted-foreground">
                  {selectedMatch.homeTournamentTeam?.team.name ?? ''}
                </span>
                <ScoreInput
                  value={homeScore}
                  onChange={setHomeScore}
                  disabled={!isOwner || isSelectedMatchLocked}
                  ariaLabel={`Goles ${getMatchNameLabel(selectedMatch, 'home')}`}
                />
              </div>

              {/* Away */}
              <div className="flex flex-col items-center gap-2">
                <TeamLabel
                  name={getMatchNameLabel(selectedMatch, 'away')}
                  code={getMatchCodeLabel(selectedMatch, 'away')}
                  flagEmoji={getMatchFlagEmoji(selectedMatch, 'away')}
                  format="compact"
                  className="text-base font-extrabold leading-none text-foreground"
                />
                <span className="max-w-[80px] truncate text-center text-[11px] text-muted-foreground">
                  {selectedMatch.awayTournamentTeam?.team.name ?? ''}
                </span>
                <ScoreInput
                  value={awayScore}
                  onChange={setAwayScore}
                  disabled={!isOwner || isSelectedMatchLocked}
                  ariaLabel={`Goles ${getMatchNameLabel(selectedMatch, 'away')}`}
                />
              </div>
            </div>

            {/* Prediction status */}
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Marcador:</span>
              {bundle?.matchPrediction ? (
                bundle.matchPrediction.isScored ? (
                  <Badge variant="success">{bundle.matchPrediction.pointsAwarded} pts</Badge>
                ) : (
                  <Badge variant="muted">Sin puntuar</Badge>
                )
              ) : (
                <Badge variant="muted">Sin predicción</Badge>
              )}
            </div>

            {/* Breakdown */}
            {bundle?.matchPredictionBreakdown && bundle.matchPrediction?.isScored ? (
              <div className="mt-3 rounded-xl border border-border/50 bg-background/60 p-3 text-xs">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Desglose
                </p>
                {[
                  ['Marcador exacto', bundle.matchPredictionBreakdown.exactScore],
                  ['Diferencia de gol', bundle.matchPredictionBreakdown.goalDifference],
                  ['Ganador', bundle.matchPredictionBreakdown.winner],
                  ['Perdedor', bundle.matchPredictionBreakdown.loser],
                  ['Goles local', bundle.matchPredictionBreakdown.homeGoals],
                  ['Goles visita', bundle.matchPredictionBreakdown.awayGoals],
                  ['Total de goles', bundle.matchPredictionBreakdown.totalGoals],
                ].map(([label, pts]) => (
                  <div key={label as string} className="flex items-center justify-between py-0.5">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="tabular-nums font-semibold">+{pts}</span>
                  </div>
                ))}
                <div className="mt-1.5 flex items-center justify-between border-t border-border/50 pt-1.5 font-bold">
                  <span>Total</span>
                  <span>{bundle.matchPredictionBreakdown.totalPoints} pts</span>
                </div>
              </div>
            ) : null}
          </section>

          {/* ── Bonus questions ── */}
          {bundle?.questions.length === 0 ? (
            <StatePanel variant="empty" description="Este partido no tiene preguntas bonus publicadas." compact />
          ) : null}

          {bundle?.questions.map((question) => (
            <Card key={question.id} className="border-border/60">
              <CardContent className="grid gap-3 py-4">
                <div className="flex flex-wrap items-start gap-2">
                  <h3 className="flex-1 font-semibold text-foreground">{question.questionText}</h3>
                  <Badge variant="muted" className="shrink-0">{questionTypeLabel(question.answerType)}</Badge>
                  {question.isResolved ? <Badge variant="warning" className="shrink-0">Resuelta</Badge> : null}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Puntos:</span>
                  {questionPredictionById.get(question.id) ? (
                    questionPredictionById.get(question.id)?.isScored ? (
                      <Badge variant="success">
                        {questionPredictionById.get(question.id)?.pointsAwarded ?? 0} pts
                      </Badge>
                    ) : (
                      <Badge variant="muted">Sin puntuar</Badge>
                    )
                  ) : (
                    <Badge variant="muted">Sin respuesta</Badge>
                  )}
                </div>

                <QuestionInput
                  question={question}
                  value={questionDrafts[question.id]}
                  readOnly={!isOwner || isSelectedMatchLocked || isQuestionLocked(question)}
                  onChange={(next) =>
                    setQuestionDrafts((prev) => ({ ...prev, [question.id]: next }))
                  }
                />

                {/* Correct answer — only shown when resolved */}
                {question.isResolved && question.correctOptionId && (() => {
                  const correctOpt = question.options.find((o) => o.id === question.correctOptionId);
                  if (!correctOpt) return null;
                  const userPred = questionPredictionById.get(question.id);
                  const userOptionId = userPred?.selectedOptionId ?? null;
                  const isCorrect = userPred?.isScored ? (userPred.pointsAwarded ?? 0) > 0 : null;
                  const correctName = correctOpt.player?.fullName ?? correctOpt.label;
                  const correctMeta = correctOpt.player
                    ? [
                        correctOpt.player.shirtNumber != null ? `#${correctOpt.player.shirtNumber}` : null,
                        correctOpt.player.position ?? correctOpt.player.preferredPosition,
                        correctOpt.player.teamName,
                      ].filter(Boolean).join(' · ')
                    : null;

                  return (
                    <div
                      className={cn(
                        'rounded-xl border px-4 py-3',
                        isCorrect === true
                          ? 'border-emerald-400/30 bg-emerald-500/10'
                          : isCorrect === false
                          ? 'border-rose-400/20 bg-rose-500/10'
                          : 'border-primary/20 bg-primary/5',
                      )}
                    >
                      {isCorrect === false && userOptionId && userOptionId !== question.correctOptionId && (() => {
                        const userOpt = question.options.find((o) => o.id === userOptionId);
                        if (!userOpt) return null;
                        const userMeta = userOpt.player
                          ? [
                              userOpt.player.shirtNumber != null ? `#${userOpt.player.shirtNumber}` : null,
                              userOpt.player.position ?? userOpt.player.preferredPosition,
                              userOpt.player.teamName,
                            ].filter(Boolean).join(' · ')
                          : null;
                        return (
                          <div className="mb-2 flex flex-col gap-0.5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400/70">
                              Tu respuesta
                            </p>
                            <p className="text-sm font-semibold text-rose-300 line-through">
                              {userOpt.player?.fullName ?? userOpt.label}
                            </p>
                            {userMeta && (
                              <p className="text-[11px] text-rose-400/60 line-through">{userMeta}</p>
                            )}
                          </div>
                        );
                      })()}
                      <div className="flex flex-col gap-0.5">
                        <p
                          className={cn(
                            'text-[10px] font-bold uppercase tracking-widest',
                            isCorrect === true
                              ? 'text-emerald-400/70'
                              : isCorrect === false
                              ? 'text-emerald-400/70'
                              : 'text-primary/70',
                          )}
                        >
                          Respuesta correcta
                        </p>
                        <p
                          className={cn(
                            'text-sm font-bold',
                            isCorrect === true ? 'text-emerald-300' : 'text-foreground',
                          )}
                        >
                          {correctName}
                        </p>
                        {correctMeta && (
                          <p
                            className={cn(
                              'text-[11px]',
                              isCorrect === true ? 'text-emerald-400/60' : 'text-muted-foreground',
                            )}
                          >
                            {correctMeta}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          ))}

          {/* ── Error ── */}
          {error ? <StatePanel variant="error" description={error} compact /> : null}

          {/* ── Inline save — desktop only (mobile uses the sticky bar below) ── */}
          {isOwner ? (
            <div className="hidden lg:grid gap-2 pb-2">
              {!isSelectedMatchLocked ? (
                <>
                  <Button className="w-full gap-2" onClick={saveAllPredictions} disabled={saving}>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    Guardar todo
                  </Button>
                  <div className="flex justify-center">
                    <SaveFeedback saving={saving} message={success} />
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Guarda marcador y bonus en una sola acción.
                  </p>
                </>
              ) : (
                <Button
                  className="w-full gap-2 cursor-not-allowed border-rose-400/40 bg-rose-500/10 text-rose-400 opacity-100 hover:bg-rose-500/10 hover:text-rose-400"
                  disabled
                  variant="outline"
                >
                  <Lock className="h-4 w-4" aria-hidden="true" />
                  Predicciones bloqueadas
                </Button>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <StatePanel variant="empty" description="No hay partidos disponibles." />
      )}

      {/* ── Sticky save bar — mobile only ────────────────────────────────────────
          Fixed above the bottom nav (bottom-16 = 64px = h-16 of the bottom nav).
          Shown for all owner matches: save action when SCHEDULED, locked state otherwise.
          paddingBottom uses env(safe-area-inset-bottom) for iPhone notch clearance.
          Error is shown inline here so the user doesn't need to scroll to see it. */}
      {isOwner && selectedMatch !== null && !bundleLoading ? (
        <div
          className="lg:hidden fixed bottom-16 left-0 right-0 z-30 border-t border-border/70 bg-surface/95 px-4 pt-3 backdrop-blur-sm"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          {!isSelectedMatchLocked ? (
            <>
              <Button
                className="w-full gap-2"
                onClick={saveAllPredictions}
                disabled={saving}
              >
                {saving ? (
                  'Guardando...'
                ) : success ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Guardado
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    Guardar
                  </>
                )}
              </Button>
              {error ? (
                <p className="mt-2 text-center text-xs font-semibold text-rose-400">{error}</p>
              ) : null}
            </>
          ) : (
            <Button
              className="w-full gap-2 cursor-not-allowed border-rose-400/40 bg-rose-500/10 text-rose-400 opacity-100 hover:bg-rose-500/10 hover:text-rose-400"
              disabled
              variant="outline"
            >
              <Lock className="h-4 w-4" aria-hidden="true" />
              Predicciones bloqueadas
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function EntryPredictionsPageWrapper() {
  return (
    <Suspense fallback={<StatePanel variant="loading" description="Cargando predicciones..." />}>
      <EntryPredictionsPage />
    </Suspense>
  );
}

// ── FilterPill ────────────────────────────────────────────────────────────────

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold',
        'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

// ── PillOption ────────────────────────────────────────────────────────────────

function PillOption({
  selected,
  onClick,
  disabled,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex min-h-[36px] items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold',
        'transition-all duration-150 active:scale-[0.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        selected
          ? 'border-primary bg-primary text-primary-foreground shadow-card-sm'
          : 'border-border/70 bg-surface/90 text-foreground hover:border-primary/30 hover:bg-primary/5',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      {selected && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />}
      {children}
    </button>
  );
}

// ── QuestionInput ─────────────────────────────────────────────────────────────

function QuestionInput({
  question,
  value,
  readOnly = false,
  onChange,
}: {
  question: MatchPredictionsBundle['questions'][number];
  value: QuestionDraft | undefined;
  readOnly?: boolean;
  onChange: (value: QuestionDraft) => void;
}) {
  // PLAYER_PICK handles its own readOnly confirmation internally
  if (question.answerType === 'PLAYER_PICK') {
    const selectedOption = question.options.find(
      (o) =>
        o.id === value?.selectedOptionId ||
        (o.playerId !== null && o.playerId === value?.selectedPlayerId),
    );
    return (
      <PlayerPickDropdown
        options={question.options}
        selectedOption={selectedOption}
        readOnly={readOnly}
        onChange={(option) =>
          onChange(
            option.playerId
              ? { selectedPlayerId: option.playerId }
              : { selectedOptionId: option.id },
          )
        }
        ariaLabel={question.questionText}
      />
    );
  }

  // Derive saved answer label for all other types
  let savedLabel: string | null = null;
  if (question.answerType === 'BOOLEAN') {
    if (value?.selectedBoolean === true) savedLabel = 'Sí';
    else if (value?.selectedBoolean === false) savedLabel = 'No';
  } else if (question.answerType === 'TIME_RANGE') {
    savedLabel = question.options.find((o) => o.key === value?.selectedTimeRangeKey)?.label ?? null;
  } else {
    // TEAM_PICK, SINGLE_CHOICE
    savedLabel = question.options.find((o) => o.id === value?.selectedOptionId)?.label ?? null;
  }

  // ReadOnly: show confirmation box instead of disabled pills
  if (readOnly) {
    return savedLabel ? (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
          <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">
            Tu respuesta guardada
          </p>
          <p className="truncate font-semibold text-foreground">{savedLabel}</p>
        </div>
      </div>
    ) : (
      <div className="rounded-xl border border-border/40 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        No respondiste esta pregunta.
      </div>
    );
  }

  // Editable: render pills
  if (question.answerType === 'BOOLEAN') {
    return (
      <div role="radiogroup" aria-label={question.questionText} className="flex flex-wrap gap-2">
        <PillOption
          selected={value?.selectedBoolean === true}
          onClick={() => onChange({ selectedBoolean: true })}
          disabled={false}
        >
          Sí
        </PillOption>
        <PillOption
          selected={value?.selectedBoolean === false}
          onClick={() => onChange({ selectedBoolean: false })}
          disabled={false}
        >
          No
        </PillOption>
      </div>
    );
  }

  if (question.answerType === 'TIME_RANGE') {
    return (
      <div role="radiogroup" aria-label={question.questionText} className="flex flex-wrap gap-2">
        {question.options.map((option) => (
          <PillOption
            key={option.id}
            selected={value?.selectedTimeRangeKey === option.key}
            onClick={() => onChange({ selectedTimeRangeKey: option.key })}
            disabled={false}
          >
            {option.label}
          </PillOption>
        ))}
      </div>
    );
  }

  if (question.answerType === 'TEAM_PICK') {
    return (
      <div role="radiogroup" aria-label={question.questionText} className="flex flex-wrap gap-2">
        {question.options.map((option) => (
          <PillOption
            key={option.id}
            selected={value?.selectedOptionId === option.id}
            onClick={() => onChange({ selectedOptionId: option.id })}
            disabled={false}
          >
            {option.label}
          </PillOption>
        ))}
      </div>
    );
  }

  return (
    <div role="radiogroup" aria-label={question.questionText} className="flex flex-wrap gap-2">
      {question.options.map((option) => (
        <PillOption
          key={option.id}
          selected={value?.selectedOptionId === option.id}
          onClick={() => onChange({ selectedOptionId: option.id })}
          disabled={false}
        >
          {option.label}
        </PillOption>
      ))}
    </div>
  );
}

// ── LockedMatchBanner ─────────────────────────────────────────────────────────

function LockedMatchBanner({
  kickoffAt,
  status,
  lockAt,
}: {
  kickoffAt: string;
  status: string;
  lockAt: Date | null;
}) {
  const isTimeLocked  = status === 'SCHEDULED'; // locked by window, not yet started
  const isLive        = status === 'LIVE';

  const closedAt = lockAt ?? new Date(kickoffAt);
  const closedStr = formatMatchKickoff(closedAt.toISOString());

  let body: string;
  if (isTimeLocked) {
    body = 'El tiempo de predicción para este partido ya cerró.';
  } else if (isLive) {
    body = 'Este partido está en juego y las predicciones ya no pueden editarse.';
  } else {
    body = 'Este partido ya finalizó y las predicciones ya no pueden editarse.';
  }

  return (
    <div
      role="status"
      aria-label="Predicciones cerradas"
      className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-5 text-center"
    >
      <div className="mb-3 flex justify-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/15">
          <Lock className="h-6 w-6 text-rose-500" aria-hidden="true" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-rose-400">Predicciones cerradas</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
      <p className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Clock className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
        {isTimeLocked ? `Cerró: ${closedStr}` : `Inició: ${closedStr}`}
      </p>
    </div>
  );
}

// ── PlayerPickDropdown ────────────────────────────────────────────────────────

function PlayerPickDropdown({
  options,
  selectedOption,
  readOnly,
  onChange,
  ariaLabel,
}: {
  options: MatchQuestionOption[];
  selectedOption: MatchQuestionOption | undefined;
  readOnly: boolean;
  onChange: (option: MatchQuestionOption) => void;
  ariaLabel: string;
}) {
  const [search, setSearch] = useState('');

  const q = normalizeSearchText(search);
  const filtered = options.filter((o) =>
    normalizeSearchText(o.player?.fullName).includes(q) ||
    normalizeSearchText(o.label).includes(q) ||
    normalizeSearchText(o.player?.teamName).includes(q),
  );

  // ── readOnly: only show saved answer, no list ──────────────────────────────
  if (readOnly) {
    return selectedOption ? (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
          <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">
            Tu respuesta guardada
          </p>
          <p className="truncate font-semibold text-foreground">
            {selectedOption.player?.fullName ?? selectedOption.label}
          </p>
          {selectedOption.player && (() => {
            const meta = [
              selectedOption.player!.shirtNumber != null ? `#${selectedOption.player!.shirtNumber}` : null,
              selectedOption.player!.position ?? selectedOption.player!.preferredPosition,
              selectedOption.player!.teamName,
            ].filter(Boolean).join(' · ');
            return meta ? (
              <p className="mt-0.5 text-[11px] text-emerald-400/60">{meta}</p>
            ) : null;
          })()}
        </div>
      </div>
    ) : (
      <div className="rounded-xl border border-border/40 bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        No respondiste esta pregunta.
      </div>
    );
  }

  // ── editable ───────────────────────────────────────────────────────────────
  return (
    <div role="listbox" aria-label={ariaLabel}>
      {/* Saved answer chip — visible when a selection exists */}
      {selectedOption ? (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
            <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70">
              Seleccionado
            </p>
            <p className="truncate text-sm font-semibold text-foreground">
              {selectedOption.player?.fullName ?? selectedOption.label}
            </p>
            {selectedOption.player && (() => {
              const meta = [
                selectedOption.player!.shirtNumber != null ? `#${selectedOption.player!.shirtNumber}` : null,
                selectedOption.player!.position ?? selectedOption.player!.preferredPosition,
                selectedOption.player!.teamName,
              ].filter(Boolean).join(' · ');
              return meta ? (
                <p className="mt-0.5 text-[10px] text-emerald-400/60">{meta}</p>
              ) : null;
            })()}
          </div>
        </div>
      ) : (
        <p className="mb-2 text-xs text-muted-foreground">Elige un jugador de la lista.</p>
      )}

      {/* Search */}
      <div className="relative mb-2">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="text"
          placeholder="Buscar jugador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-border/60 bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
        />
      </div>

      {/* List */}
      <div className="scrollbar-sport max-h-52 overflow-y-auto rounded-xl border border-border/40 bg-background/60">
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-center text-xs text-muted-foreground">Sin resultados.</p>
        ) : (
          <div className="p-1">
            {filtered.map((option) => {
              const isSelected = option.id === selectedOption?.id;
              const meta = option.player
                ? [
                    option.player.shirtNumber != null ? `#${option.player.shirtNumber}` : null,
                    option.player.position ?? option.player.preferredPosition,
                    option.player.teamName,
                  ]
                    .filter(Boolean)
                    .join(' · ')
                : null;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onChange(option)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left',
                    'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-card-sm'
                      : 'text-foreground hover:bg-muted',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {option.player?.fullName ?? option.label}
                    </span>
                    {meta && (
                      <span
                        className={cn(
                          'block truncate text-[11px]',
                          isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground',
                        )}
                      >
                        {meta}
                      </span>
                    )}
                  </span>
                  {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
