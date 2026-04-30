'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { formatDateTime, matchStatusLabel, questionTypeLabel } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { MatchPredictionsBundle, PoolDetail, PoolMatch, PoolMatchesResponse } from '@/types/api';
import { PoolContextTabs } from '@/components/layout/pool-context-tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SaveFeedback } from '@/components/ui/save-feedback';
import { StatePanel } from '@/components/ui/state-panel';

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

const GROUP_CODES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'] as const;
const KNOCKOUT_STAGES = [
  'ROUND_OF_32',
  'ROUND_OF_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE',
  'FINAL',
] as const;

function getStageLabel(stage: string) {
  switch (stage) {
    case 'ROUND_OF_32':
      return 'R32';
    case 'ROUND_OF_16':
      return 'R16';
    case 'QUARTER_FINAL':
      return 'QF';
    case 'SEMI_FINAL':
      return 'SF';
    case 'THIRD_PLACE':
      return '3P';
    case 'FINAL':
      return 'Final';
    default:
      return stage;
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

export default function EntryPredictionsPage() {
  const params = useParams<{ poolId: string; entryId: string }>();
  const poolId = params.poolId;
  const entryId = params.entryId;

  const { token } = useAuth();

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) ?? null,
    [matches, selectedMatchId],
  );

  const questionPredictionById = useMemo(() => {
    const rows = bundle?.questionPredictions ?? [];
    return new Map(rows.map((row) => [row.matchQuestionId, row]));
  }, [bundle?.questionPredictions]);

  useEffect(() => {
    if (!token) {
      return;
    }

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
        setSelectedMatchId(list[0]?.id ?? null);
        setIsOwner(myEntries.some((entry) => entry.id === entryId));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la pantalla de predicciones.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [poolId, token]);

  const visibleMatches = useMemo(() => {
    if (isOwner) {
      return matches;
    }

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
          const predictedQuestionIds = new Set(data.questionPredictions.map((prediction) => prediction.matchQuestionId));
          const questionsTotal = data.questions.length;
          const questionsDone = data.questions.filter((question) => predictedQuestionIds.has(question.id)).length;
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

    return () => {
      cancelled = true;
    };
  }, [token, visibleMatches, poolId, entryId]);

  useEffect(() => {
    if (!token || !selectedMatchId) {
      return;
    }

    const loadBundle = async () => {
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
      }
    };

    void loadBundle();
  }, [entryId, poolId, selectedMatchId, token]);

  const filteredMatches = useMemo(() => {
    return visibleMatches.filter((match) => {
      const isGroup = match.stage === 'GROUP';
      if (phaseFilter === 'GROUP' && !isGroup) {
        return false;
      }
      if (phaseFilter === 'KNOCKOUT' && isGroup) {
        return false;
      }

      if (phaseFilter === 'GROUP' && groupFilter !== 'ALL' && match.group?.code !== groupFilter) {
        return false;
      }

      if (phaseFilter === 'KNOCKOUT' && knockoutRoundFilter !== 'ALL' && match.stage !== knockoutRoundFilter) {
        return false;
      }

      if (pendingOnly && isOwner) {
        const summary = predictionSummaryByMatch[match.id];
        if (summary?.isComplete) {
          return false;
        }
      }

      return true;
    });
  }, [visibleMatches, phaseFilter, groupFilter, knockoutRoundFilter, pendingOnly, predictionSummaryByMatch, isOwner]);

  useEffect(() => {
    if (filteredMatches.length === 0) {
      return;
    }

    const selectedStillVisible = filteredMatches.some((match) => match.id === selectedMatchId);
    if (!selectedStillVisible) {
      setSelectedMatchId(filteredMatches[0].id);
    }
  }, [filteredMatches, selectedMatchId]);

  const progress = useMemo(() => {
    const editableMatches = matches.filter((match) => match.status === 'SCHEDULED');
    const completeCount = editableMatches.reduce((acc, match) => {
      return acc + (predictionSummaryByMatch[match.id]?.isComplete ? 1 : 0);
    }, 0);

    return {
      totalEditable: editableMatches.length,
      completeCount,
      percent: editableMatches.length > 0 ? Math.round((completeCount / editableMatches.length) * 100) : 0,
    };
  }, [matches, predictionSummaryByMatch]);

  const jumpToNextPending = () => {
    if (filteredMatches.length === 0) {
      return;
    }

    const startIndex = Math.max(
      0,
      filteredMatches.findIndex((match) => match.id === selectedMatchId),
    );

    for (let i = 1; i <= filteredMatches.length; i += 1) {
      const next = filteredMatches[(startIndex + i) % filteredMatches.length];
      const summary = predictionSummaryByMatch[next.id];
      if (!summary?.isComplete && next.status === 'SCHEDULED') {
        setSelectedMatchId(next.id);
        return;
      }
    }
  };

  const updateSummaryForMatch = (updated: MatchPredictionsBundle) => {
    const predictedQuestionIds = new Set(updated.questionPredictions.map((prediction) => prediction.matchQuestionId));
    const questionsTotal = updated.questions.length;
    const questionsDone = updated.questions.filter((question) => predictedQuestionIds.has(question.id)).length;
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
    if (!draft) {
      return null;
    }

    switch (question.answerType) {
      case 'BOOLEAN':
        return typeof draft.selectedBoolean === 'boolean'
          ? { selectedBoolean: draft.selectedBoolean }
          : null;
      case 'TIME_RANGE':
        return draft.selectedTimeRangeKey
          ? { selectedTimeRangeKey: draft.selectedTimeRangeKey }
          : null;
      case 'TEAM_PICK':
        if (draft.selectedTeamId) {
          return { selectedTeamId: draft.selectedTeamId };
        }
        if (draft.selectedOptionId) {
          return { selectedOptionId: draft.selectedOptionId };
        }
        return null;
      case 'PLAYER_PICK':
        if (draft.selectedPlayerId) {
          return { selectedPlayerId: draft.selectedPlayerId };
        }
        if (draft.selectedOptionId) {
          return { selectedOptionId: draft.selectedOptionId };
        }
        return null;
      case 'SINGLE_CHOICE':
      default:
        return draft.selectedOptionId
          ? { selectedOptionId: draft.selectedOptionId }
          : null;
    }
  };

  const saveAllPredictions = async () => {
    if (!token || !selectedMatchId) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    const hasPartialScore = (homeScore === '') !== (awayScore === '');
    if (hasPartialScore) {
      setError('Debes completar el marcador local y visita para guardar el partido.');
      setSaving(false);
      return;
    }

    const shouldSaveMatch = homeScore !== '' && awayScore !== '';
    const questionPayloads = (bundle?.questions ?? [])
      .filter((question) => !question.isResolved)
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
          api.upsertMatchPrediction(
            poolId,
            entryId,
            selectedMatchId,
            Number(homeScore),
            Number(awayScore),
            token,
          ),
        );
      }

      for (const entry of questionPayloads) {
        tasks.push(
          api.upsertQuestionPrediction(poolId, entryId, entry.questionId, entry.payload, token),
        );
      }

      await Promise.all(tasks);

      const updated = await api.getEntryMatchPredictions(poolId, entryId, selectedMatchId, token);
      updateSummaryForMatch(updated);

      if (shouldSaveMatch && questionsToSave.length > 0) {
        setSuccess(`Predicciones guardadas: marcador y ${questionsToSave.length} bonus.`);
      } else if (shouldSaveMatch) {
        setSuccess('Marcador guardado correctamente.');
      } else {
        setSuccess(`Bonus guardados: ${questionsToSave.length}.`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron guardar las predicciones.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <StatePanel variant="loading" description="Cargando entry y calendario..." />;
  }

  return (
    <div className="grid gap-4">
      <PoolContextTabs poolId={poolId} entryId={entryId} />

      <header className="rounded-2xl border border-border/70 bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-extrabold">Predicciones de Entry</h1>
            <p className="text-sm text-muted-foreground">
              Pool: {pool?.name ?? '-'} · Entry: {entryId.slice(-6)}
            </p>
          </div>
          {!isOwner ? <Badge variant="muted">Solo lectura</Badge> : null}
        </div>

        {isOwner ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Progreso editable: {progress.completeCount}/{progress.totalEditable} ({progress.percent}%)
            </p>
            <Button size="sm" variant="outline" onClick={jumpToNextPending} disabled={filteredMatches.length === 0}>
              Ir al siguiente pendiente
            </Button>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted sm:col-span-2">
              <div className="h-full bg-primary transition-all" style={{ width: `${progress.percent}%` }} />
            </div>
          </div>
        ) : null}
      </header>

      <section className="grid gap-3 rounded-2xl border border-border/70 bg-surface p-3">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant={phaseFilter === 'GROUP' ? 'default' : 'outline'} onClick={() => setPhaseFilter('GROUP')}>
            Fase de grupos
          </Button>
          <Button size="sm" variant={phaseFilter === 'KNOCKOUT' ? 'default' : 'outline'} onClick={() => setPhaseFilter('KNOCKOUT')}>
            Eliminatoria
          </Button>
          {isOwner ? (
            <Button size="sm" variant={pendingOnly ? 'default' : 'outline'} onClick={() => setPendingOnly((prev) => !prev)}>
              Solo pendientes
            </Button>
          ) : null}
        </div>

        {phaseFilter === 'GROUP' ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={groupFilter === 'ALL' ? 'default' : 'ghost'} onClick={() => setGroupFilter('ALL')}>
              Todos
            </Button>
            {GROUP_CODES.map((code) => (
              <Button key={code} size="sm" variant={groupFilter === code ? 'default' : 'ghost'} onClick={() => setGroupFilter(code)}>
                Grupo {code}
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={knockoutRoundFilter === 'ALL' ? 'default' : 'ghost'} onClick={() => setKnockoutRoundFilter('ALL')}>
              Todas
            </Button>
            {KNOCKOUT_STAGES.map((stage) => (
              <Button
                key={stage}
                size="sm"
                variant={knockoutRoundFilter === stage ? 'default' : 'ghost'}
                onClick={() => setKnockoutRoundFilter(stage)}
              >
                {getStageLabel(stage)}
              </Button>
            ))}
          </div>
        )}

        {loadingSummary ? <StatePanel variant="loading" compact description="Actualizando estado de tus predicciones..." /> : null}
      </section>

      <section className="overflow-x-auto rounded-2xl border border-border/70 bg-surface p-3">
        <div className="flex min-w-max gap-2">
          {filteredMatches.length === 0 ? (
            <StatePanel variant="empty" description="No hay partidos para los filtros seleccionados." compact />
          ) : (
            filteredMatches.map((match) => {
              const summary = predictionSummaryByMatch[match.id];

              return (
                <button
                  key={match.id}
                  className={`min-w-[220px] rounded-xl border px-3 py-2 text-left text-sm transition ${
                    selectedMatchId === match.id
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/70 bg-white/70 text-foreground'
                  }`}
                  onClick={() => setSelectedMatchId(match.id)}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-semibold">{getMatchCodeLabel(match, 'home')} vs {getMatchCodeLabel(match, 'away')}</p>
                    <Badge variant="muted">{match.stage === 'GROUP' ? `G-${match.group?.code ?? '?'}` : getStageLabel(match.stage)}</Badge>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDateTime(match.kickoffAt)}</span>
                    <span>{matchStatusLabel(match.status)}</span>
                  </div>
                  <div className="mt-2 text-xs">
                    {summary?.isComplete ? (
                      <span className="font-semibold text-emerald-700">Completo</span>
                    ) : (
                      <span className="font-semibold text-amber-700">Pendiente</span>
                    )}
                    {summary ? ` · Bonus ${summary.questionsDone}/${summary.questionsTotal}` : ''}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </section>

      {selectedMatch ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>
                {getMatchNameLabel(selectedMatch, 'home')} vs {getMatchNameLabel(selectedMatch, 'away')}
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="muted">{selectedMatch.stage === 'GROUP' ? `Grupo ${selectedMatch.group?.code ?? '?'}` : getStageLabel(selectedMatch.stage)}</Badge>
                <Badge variant={selectedMatch.status === 'FINISHED' ? 'success' : 'muted'}>
                  {matchStatusLabel(selectedMatch.status)}
                </Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-muted-foreground">Kickoff: {formatDateTime(selectedMatch.kickoffAt)}</p>

            <section className="grid gap-3 rounded-2xl border border-border/70 bg-white/70 p-3 sm:p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  Resultado del partido
                </p>
                <p className="text-sm text-muted-foreground">Ingresa el marcador final para este partido.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="grid gap-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Local</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">{getMatchNameLabel(selectedMatch, 'home')}</span>
                    <span className="text-xs text-muted-foreground">{getMatchCodeLabel(selectedMatch, 'home')}</span>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    placeholder="0"
                    className="h-12 text-center text-2xl font-semibold"
                    disabled={!isOwner || selectedMatch.status !== 'SCHEDULED'}
                  />
                </div>

                <span className="text-center text-2xl font-bold text-muted-foreground">-</span>

                <div className="grid gap-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Visita</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">{getMatchNameLabel(selectedMatch, 'away')}</span>
                    <span className="text-xs text-muted-foreground">{getMatchCodeLabel(selectedMatch, 'away')}</span>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    placeholder="0"
                    className="h-12 text-center text-2xl font-semibold"
                    disabled={!isOwner || selectedMatch.status !== 'SCHEDULED'}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>Marcador:</span>
                {bundle?.matchPrediction ? (
                  bundle.matchPrediction.isScored ? (
                    <Badge variant="success">{bundle.matchPrediction.pointsAwarded} pts</Badge>
                  ) : (
                    <Badge variant="muted">Sin puntuar</Badge>
                  )
                ) : (
                  <Badge variant="muted">Sin respuesta</Badge>
                )}
              </div>

              {bundle?.matchPredictionBreakdown && bundle.matchPrediction?.isScored ? (
                <div className="mt-2 grid gap-1 rounded-xl border border-border/60 bg-white/70 p-3 text-xs">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                    Desglose de puntos
                  </p>
                  <div className="flex items-center justify-between">
                    <span>Marcador exacto</span>
                    <span>+{bundle.matchPredictionBreakdown.exactScore}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Diferencia de gol</span>
                    <span>+{bundle.matchPredictionBreakdown.goalDifference}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Ganador</span>
                    <span>+{bundle.matchPredictionBreakdown.winner}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Perdedor</span>
                    <span>+{bundle.matchPredictionBreakdown.loser}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Goles local</span>
                    <span>+{bundle.matchPredictionBreakdown.homeGoals}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Goles visita</span>
                    <span>+{bundle.matchPredictionBreakdown.awayGoals}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total de goles</span>
                    <span>+{bundle.matchPredictionBreakdown.totalGoals}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between font-semibold">
                    <span>Total</span>
                    <span>{bundle.matchPredictionBreakdown.totalPoints} pts</span>
                  </div>
                </div>
              ) : null}
            </section>

            <div className="grid gap-3">
              {bundle?.questions.length === 0 ? (
                <StatePanel variant="empty" description="Este partido no tiene preguntas bonus publicadas." />
              ) : null}

              {bundle?.questions.map((question) => (
                <Card key={question.id} className="border border-border/60 bg-white/70">
                  <CardContent className="grid gap-2 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{question.questionText}</h3>
                      <Badge variant="muted">{questionTypeLabel(question.answerType)}</Badge>
                      {question.isResolved ? <Badge variant="warning">Resuelta</Badge> : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
                      readOnly={!isOwner || selectedMatch.status !== 'SCHEDULED'}
                      onChange={(next) =>
                        setQuestionDrafts((prev) => ({
                          ...prev,
                          [question.id]: next,
                        }))
                      }
                    />
                  </CardContent>
                </Card>
              ))}
            </div>

            {error ? <StatePanel variant="error" description={error} /> : null}

            {isOwner ? (
              <div className="grid gap-2 pt-2">
                <Button
                  className="w-full"
                  onClick={saveAllPredictions}
                  disabled={saving}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Guardar todo
                </Button>
                <div className="flex justify-center">
                  <SaveFeedback saving={saving} message={success} />
                </div>
                <p className="text-xs text-muted-foreground">
                  Guarda marcador y bonus en una sola accion.
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <StatePanel variant="empty" description="No hay partidos disponibles para esta pool." />
      )}
    </div>
  );
}

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
  if (question.answerType === 'BOOLEAN') {
    return (
      <div className="flex gap-2">
        <Button
          type="button"
          variant={value?.selectedBoolean === true ? 'default' : 'outline'}
          size="sm"
          onClick={() => (readOnly ? null : onChange({ selectedBoolean: true }))}
          disabled={readOnly}
        >
          Si
        </Button>
        <Button
          type="button"
          variant={value?.selectedBoolean === false ? 'default' : 'outline'}
          size="sm"
          onClick={() => (readOnly ? null : onChange({ selectedBoolean: false }))}
          disabled={readOnly}
        >
          No
        </Button>
      </div>
    );
  }

  if (question.answerType === 'TIME_RANGE') {
    return (
      <div className="grid gap-1">
        {question.options.map((option) => (
          <label key={option.id} className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={question.id}
              checked={value?.selectedTimeRangeKey === option.key}
              onChange={() => (readOnly ? null : onChange({ selectedTimeRangeKey: option.key }))}
              disabled={readOnly}
            />
            {option.label}
          </label>
        ))}
      </div>
    );
  }

  if (question.answerType === 'TEAM_PICK') {
    return (
      <div className="grid gap-1">
        {question.options.map((option) => (
          <label key={option.id} className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={question.id}
              checked={value?.selectedOptionId === option.id}
              onChange={() => (readOnly ? null : onChange({ selectedOptionId: option.id }))}
              disabled={readOnly}
            />
            {option.label}
          </label>
        ))}
      </div>
    );
  }

  if (question.answerType === 'PLAYER_PICK') {
    return (
      <div className="grid gap-1">
        {question.options.map((option) => (
          <label key={option.id} className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={question.id}
              checked={value?.selectedOptionId === option.id || value?.selectedPlayerId === option.playerId}
              onChange={() =>
                readOnly
                  ? null
                  : onChange(
                      option.playerId
                        ? { selectedPlayerId: option.playerId }
                        : { selectedOptionId: option.id },
                    )
              }
              disabled={readOnly}
            />
            {option.label}
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      {question.options.map((option) => (
        <label key={option.id} className="inline-flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={question.id}
            checked={value?.selectedOptionId === option.id}
            onChange={() => (readOnly ? null : onChange({ selectedOptionId: option.id }))}
            disabled={readOnly}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
