'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Plus, Save, Trash2 } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import {
  AdminMatchPlayerPoolResponse,
  AdminMatchQuestion,
  AdminMatchQuestionsResponse,
  CreateAdminQuestionPayload,
} from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { Input } from '@/components/ui/input';
import { StatePanel } from '@/components/ui/state-panel';

type NewQuestionForm = {
  questionText: string;
  answerType: 'BOOLEAN' | 'SINGLE_CHOICE' | 'TEAM_PICK' | 'PLAYER_PICK' | 'TIME_RANGE';
  points: string;
  lockAt: string;
  optionLabels: string;
  isPublished: boolean;
};

const TYPE_LABELS: Record<NewQuestionForm['answerType'], string> = {
  BOOLEAN: 'Sí / No',
  SINGLE_CHOICE: 'Opción única',
  TEAM_PICK: 'Equipo',
  PLAYER_PICK: 'Jugador',
  TIME_RANGE: 'Rango horario',
};

const ANSWER_TYPES: NewQuestionForm['answerType'][] = [
  'BOOLEAN',
  'SINGLE_CHOICE',
  'TEAM_PICK',
  'PLAYER_PICK',
  'TIME_RANGE',
];

const SELECT_CLASS =
  'h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25';

type MatchContext = AdminMatchQuestionsResponse['match'];

function formatTeamLabel(team: AdminMatchPlayerPoolResponse['teams'][number]) {
  const baseName =
    team.teamName && team.teamName !== team.teamCode
      ? `${team.teamName} (${team.teamCode})`
      : team.teamCode;
  if (team.matchSide === 'HOME') return `Local: ${baseName}`;
  if (team.matchSide === 'AWAY') return `Visita: ${baseName}`;
  return baseName;
}

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
        {label}
      </p>
      {children}
    </div>
  );
}

export default function MatchQuestionsPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params?.matchId ?? '';
  const { token } = useAuth();

  const [questions, setQuestions] = useState<AdminMatchQuestion[]>([]);
  const [matchContext, setMatchContext] = useState<MatchContext | null>(null);
  const [playerPool, setPlayerPool] = useState<AdminMatchPlayerPoolResponse | null>(null);

  const [newQuestion, setNewQuestion] = useState<NewQuestionForm>({
    questionText: '',
    answerType: 'BOOLEAN',
    points: '1',
    lockAt: '',
    optionLabels: '',
    isPublished: true,
  });

  const [editingPrompt, setEditingPrompt] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<Record<string, string>>({});
  const [resolutionDraft, setResolutionDraft] = useState<Record<string, string>>({});

  const [creating, setCreating] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [publishWorkingId, setPublishWorkingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Player pick state
  const [selectedPlayerTeamCode, setSelectedPlayerTeamCode] = useState<string>('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [playerScope, setPlayerScope] = useState<'TEAM' | 'MATCH'>('TEAM');

  // Team pick state (for TEAM_PICK answer type)
  const [selectedTeamPickIds, setSelectedTeamPickIds] = useState<string[]>([]);
  const [includeNeitherTeam, setIncludeNeitherTeam] = useState(false);

  // Derived player pool helpers
  const selectableTeams = playerPool?.teams.filter((t) => t.matchSide) ?? [];
  const fallbackTeams = playerPool?.teams ?? [];
  const teamOptions = selectableTeams.length > 0 ? selectableTeams : fallbackTeams;
  const matchTeams = selectableTeams.length > 0 ? selectableTeams : [];
  const selectedTeam = playerPool?.teams.find((t) => t.teamCode === selectedPlayerTeamCode) ?? null;
  const teamPlayers = selectedTeam?.players ?? [];
  const matchPlayers = matchTeams.flatMap((t) =>
    t.players.map((p) => ({ ...p, teamCode: t.teamCode })),
  );
  const playerOptions =
    playerScope === 'MATCH'
      ? matchPlayers
      : teamPlayers.map((p) => ({ ...p, teamCode: selectedTeam?.teamCode ?? '' }));

  const selectAllTeamPlayers = () => setSelectedPlayerIds(teamPlayers.map((p) => p.playerId));
  const selectAllMatchPlayers = () =>
    setSelectedPlayerIds(Array.from(new Set(matchPlayers.map((p) => p.playerId))));

  const loadQuestions = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [questionData, playerPoolData] = await Promise.all([
        api.adminListMatchQuestions(matchId, token),
        api.adminListMatchPlayerPool(matchId, token),
      ]);

      setMatchContext(questionData.match);
      setQuestions(questionData.questions);
      setEditingPrompt(Object.fromEntries(questionData.questions.map((q) => [q.id, q.questionText])));
      setResolutionDraft(Object.fromEntries(questionData.questions.map((q) => [q.id, q.correctOptionId ?? ''])));
      setSelectedOption(
        Object.fromEntries(
          questionData.questions.map((q) => [q.id, q.correctOptionId ?? q.options[0]?.id ?? '']),
        ),
      );

      setPlayerPool(playerPoolData);
      const preferred = playerPoolData.teams.find((t) => t.matchSide)?.teamCode;
      setSelectedPlayerTeamCode(preferred ?? playerPoolData.teams[0]?.teamCode ?? '');
      setSelectedPlayerIds([]);
      setPlayerScope('TEAM');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las preguntas.');
    } finally {
      setLoading(false);
    }
  }, [token, matchId]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  const createQuestion = async () => {
    if (!token) return;
    if (!newQuestion.questionText.trim()) {
      setError('El enunciado es obligatorio.');
      return;
    }
    const points = Number(newQuestion.points);
    if (Number.isNaN(points) || points < 0) {
      setError('Los puntos deben ser un número mayor o igual a 0.');
      return;
    }

    const payload: CreateAdminQuestionPayload = {
      questionText: newQuestion.questionText.trim(),
      answerType: newQuestion.answerType,
      pointsOverride: points,
      isPublished: newQuestion.isPublished,
    };

    if (newQuestion.lockAt) {
      payload.lockAt = new Date(newQuestion.lockAt).toISOString();
    }

    if (newQuestion.answerType === 'PLAYER_PICK') {
      if (!playerPool) {
        setError('No se pudo cargar el pool de jugadores para este partido.');
        return;
      }
      const candidates =
        playerScope === 'MATCH'
          ? matchPlayers
          : teamPlayers.map((p) => ({ ...p, teamCode: selectedTeam?.teamCode ?? '' }));

      if (playerScope === 'TEAM' && !selectedTeam) {
        setError('Debes seleccionar un equipo para preguntas de Jugador.');
        return;
      }
      if (playerScope === 'MATCH' && matchPlayers.length === 0) {
        setError('Este partido no tiene equipos asignados todavía.');
        return;
      }

      const picked = candidates.filter((p) => selectedPlayerIds.includes(p.playerId));
      if (picked.length < 2) {
        setError('Debes seleccionar al menos 2 jugadores.');
        return;
      }

      payload.options = picked.map((p, i) => ({
        key: `PLAYER_${i + 1}`,
        label: p.fullName,
        playerId: p.playerId,
      }));
    } else if (newQuestion.answerType === 'TEAM_PICK') {
      if (!playerPool) {
        setError('No se pudo cargar el pool de equipos para este partido.');
        return;
      }
      const totalTeamOptions = selectedTeamPickIds.length + (includeNeitherTeam ? 1 : 0);
      if (totalTeamOptions < 2) {
        setError('Debes seleccionar al menos 2 opciones de equipo.');
        return;
      }
      const pickedTeams = teamOptions.filter((t) => selectedTeamPickIds.includes(t.teamId));
      payload.options = pickedTeams.map((team, i) => ({
        key: `TEAM_${i + 1}`,
        label: team.teamName || team.teamCode,
        teamId: team.teamId,
      }));
      if (includeNeitherTeam) {
        payload.options.push({ key: 'TEAM_NONE', label: 'Ninguno de los dos' });
      }
    } else if (newQuestion.answerType !== 'BOOLEAN') {
      const labels = newQuestion.optionLabels
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
      if (labels.length < 2) {
        setError('Debes ingresar al menos 2 opciones separadas por coma.');
        return;
      }
      payload.options = labels.map((label, i) => ({ key: `OPT_${i + 1}`, label }));
    }

    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await api.adminCreateQuestion(matchId, payload, token);
      setQuestions((prev) => [created, ...prev]);
      setEditingPrompt((prev) => ({ ...prev, [created.id]: created.questionText }));
      setResolutionDraft((prev) => ({ ...prev, [created.id]: created.correctOptionId ?? '' }));
      setSelectedOption((prev) => ({ ...prev, [created.id]: created.options[0]?.id ?? '' }));
      setNewQuestion({
        questionText: '',
        answerType: 'BOOLEAN',
        points: '1',
        lockAt: '',
        optionLabels: '',
        isPublished: true,
      });
      setSelectedTeamPickIds([]);
      setIncludeNeitherTeam(false);
      setSuccess(newQuestion.isPublished ? 'Pregunta creada y publicada.' : 'Pregunta creada como borrador.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la pregunta.');
    } finally {
      setCreating(false);
    }
  };

  const saveQuestion = async (questionId: string) => {
    if (!token) return;
    const questionText = (editingPrompt[questionId] ?? '').trim();
    if (!questionText) {
      setError('El enunciado no puede quedar vacío.');
      return;
    }
    setWorkingId(questionId);
    setError(null);
    setSuccess(null);
    try {
      const updated = await api.adminUpdateQuestion(questionId, { questionText }, token);
      setQuestions((prev) => prev.map((q) => (q.id === questionId ? updated : q)));
      setSuccess('Enunciado actualizado.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar la pregunta.');
    } finally {
      setWorkingId(null);
    }
  };

  const togglePublish = async (question: AdminMatchQuestion) => {
    if (!token) return;
    setPublishWorkingId(question.id);
    setError(null);
    setSuccess(null);
    try {
      const updated = await api.adminUpdateQuestion(question.id, { isPublished: !question.isPublished }, token);
      setQuestions((prev) => prev.map((q) => (q.id === question.id ? updated : q)));
      setSuccess(updated.isPublished ? 'Pregunta publicada.' : 'Pregunta movida a borrador.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cambiar el estado de publicación.');
    } finally {
      setPublishWorkingId(null);
    }
  };

  const deleteQuestion = async (questionId: string) => {
    if (!token) return;
    setError(null);
    setSuccess(null);
    try {
      await api.adminDeleteQuestion(questionId, token);
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      setSuccess('Pregunta eliminada correctamente.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar la pregunta.');
    }
  };

  const resolveQuestion = async (questionId: string) => {
    if (!token) return;
    const optionId = selectedOption[questionId] || resolutionDraft[questionId];
    if (!optionId) {
      setError('Debes seleccionar una opción correcta.');
      return;
    }
    setWorkingId(questionId);
    setError(null);
    setSuccess(null);
    try {
      const resolved = await api.adminResolveQuestion(questionId, optionId, token);
      setQuestions((prev) => prev.map((q) => (q.id === questionId ? resolved : q)));
      setSuccess('Pregunta resuelta correctamente.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo resolver la pregunta.');
    } finally {
      setWorkingId(null);
    }
  };

  if (loading) {
    return <StatePanel variant="loading" description="Cargando bonus questions..." />;
  }

  const homeTeamName = matchContext?.homeTournamentTeam?.team.name;
  const awayTeamName = matchContext?.awayTournamentTeam?.team.name;
  const matchTitle = homeTeamName && awayTeamName
    ? `${homeTeamName} vs ${awayTeamName}`
    : matchContext
    ? 'Partido (equipos por definir)'
    : 'Partido';

  const backHref = playerPool?.tournamentId
    ? `/admin/tournaments/${playerPool.tournamentId}/matches`
    : '/admin/tournaments';

  const resolvedCount = questions.filter((q) => q.isResolved).length;

  return (
    <div className="grid gap-4">
      {/* ── Create card ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="gap-2">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a partidos
          </Link>
          <div>
            <CardTitle>Bonus Questions</CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">{matchTitle}</p>
          </div>
        </CardHeader>

        <CardContent className="grid gap-4">
          {/* Global feedback */}
          {error && (
            <div role="alert" aria-live="assertive">
              <StatePanel variant="error" description={error} compact />
            </div>
          )}
          {success && (
            <div role="status" aria-live="polite">
              <StatePanel variant="success" description={success} compact />
            </div>
          )}

          {/* ── New question form ─────────────────────────────────────── */}
          <div className="grid gap-5 rounded-2xl border border-white/[0.08] bg-surface p-5 shadow-inner-subtle">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Nueva pregunta
            </p>

            {/* Section 1: Enunciado */}
            <FormSection label="Enunciado">
              <div className="grid gap-1.5">
                <label htmlFor="new-question-text" className="text-sm font-medium text-foreground">
                  Texto de la pregunta <span className="text-rose-500 font-bold">*</span>
                </label>
                <Input
                  id="new-question-text"
                  placeholder="Ej: ¿El partido termina con goles en ambos arcos?"
                  value={newQuestion.questionText}
                  onChange={(e) => setNewQuestion((prev) => ({ ...prev, questionText: e.target.value }))}
                  className="bg-background/70"
                />
              </div>
            </FormSection>

            <div className="border-t border-white/[0.08]" />

            {/* Section 2: Tipo de respuesta + opciones condicionales */}
            <FormSection label="Tipo de respuesta">
              <div className="grid gap-1.5">
                <label htmlFor="new-answer-type" className="text-sm font-medium text-foreground">
                  Tipo
                </label>
                <select
                  id="new-answer-type"
                  value={newQuestion.answerType}
                  onChange={(e) => {
                    setNewQuestion((prev) => ({
                      ...prev,
                      answerType: e.target.value as NewQuestionForm['answerType'],
                      optionLabels: '',
                    }));
                    setSelectedTeamPickIds([]);
                    setIncludeNeitherTeam(false);
                    setSelectedPlayerIds([]);
                  }}
                  className={cn(SELECT_CLASS, 'bg-background/70')}
                >
                  {ANSWER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              {/* BOOLEAN hint */}
              {newQuestion.answerType === 'BOOLEAN' && (
                <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-background/40 px-3 py-2.5">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                  <span className="text-sm text-muted-foreground">
                    Genera automáticamente las opciones{' '}
                    <strong className="text-foreground">Sí</strong> y{' '}
                    <strong className="text-foreground">No</strong>.
                  </span>
                </div>
              )}

              {/* Text options — SINGLE_CHOICE / TIME_RANGE */}
              {(newQuestion.answerType === 'SINGLE_CHOICE' ||
                newQuestion.answerType === 'TIME_RANGE') && (
                <div className="grid gap-1.5">
                  <label htmlFor="new-option-labels" className="text-sm font-medium text-foreground">
                    Opciones{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      (separadas por coma, mínimo 2)
                    </span>
                  </label>
                  <Input
                    id="new-option-labels"
                    placeholder={
                      newQuestion.answerType === 'TIME_RANGE'
                        ? 'Ej: Antes del min 45, En el segundo tiempo, En penales'
                        : 'Ej: Opción A, Opción B, Opción C'
                    }
                    value={newQuestion.optionLabels}
                    onChange={(e) => setNewQuestion((prev) => ({ ...prev, optionLabels: e.target.value }))}
                    className="bg-background/70"
                  />
                </div>
              )}

              {/* Team pick — selector visual de equipos */}
              {newQuestion.answerType === 'TEAM_PICK' && (
                <div className="grid gap-3 rounded-xl border border-white/[0.06] bg-background/40 p-3">
                  {teamOptions.length === 0 ? (
                    <StatePanel
                      variant="empty"
                      description="Este partido aún no tiene equipos asignados."
                      compact
                    />
                  ) : (
                    <>
                      <span className="text-xs font-medium text-muted-foreground">
                        Equipos como opciones{' '}
                        <span className="font-normal">
                          ({selectedTeamPickIds.length + (includeNeitherTeam ? 1 : 0)} seleccionados, mín. 2)
                        </span>
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {teamOptions.map((team) => {
                          const isSelected = selectedTeamPickIds.includes(team.teamId);
                          return (
                            <button
                              key={team.teamId}
                              type="button"
                              onClick={() =>
                                setSelectedTeamPickIds((prev) =>
                                  isSelected
                                    ? prev.filter((id) => id !== team.teamId)
                                    : [...prev, team.teamId],
                                )
                              }
                              className={cn(
                                'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                                isSelected
                                  ? 'border-primary bg-primary text-primary-foreground'
                                  : 'border-input bg-background text-foreground hover:bg-muted',
                              )}
                            >
                              {formatTeamLabel(team)}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => setIncludeNeitherTeam((v) => !v)}
                          className={cn(
                            'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                            includeNeitherTeam
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'border-input bg-background text-foreground hover:bg-muted',
                          )}
                        >
                          Ninguno de los dos
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Player pick */}
              {newQuestion.answerType === 'PLAYER_PICK' && (
                <div className="grid gap-3 rounded-xl border border-white/[0.06] bg-background/40 p-3">
                  {teamOptions.length === 0 ? (
                    <StatePanel
                      variant="empty"
                      description="Este partido aún no tiene jugadores registrados. Agrega jugadores al torneo primero."
                      compact
                    />
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Alcance:
                        </span>
                        <Button
                          size="sm"
                          variant={playerScope === 'TEAM' ? 'default' : 'outline'}
                          onClick={() => { setPlayerScope('TEAM'); setSelectedPlayerIds([]); }}
                        >
                          Solo un equipo
                        </Button>
                        <Button
                          size="sm"
                          variant={playerScope === 'MATCH' ? 'default' : 'outline'}
                          onClick={() => { setPlayerScope('MATCH'); setSelectedPlayerIds([]); }}
                          disabled={matchPlayers.length === 0}
                        >
                          Ambos equipos
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setSelectedPlayerIds([])}>
                          Limpiar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={playerScope === 'TEAM' ? selectAllTeamPlayers : selectAllMatchPlayers}
                        >
                          Seleccionar todos
                        </Button>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-[200px_1fr] sm:items-start">
                        <div className="grid gap-1.5">
                          <span className="text-xs font-medium text-muted-foreground">Equipo</span>
                          <select
                            value={selectedPlayerTeamCode}
                            onChange={(e) => { setSelectedPlayerTeamCode(e.target.value); setSelectedPlayerIds([]); }}
                            disabled={playerScope === 'MATCH'}
                            className={SELECT_CLASS + ' disabled:opacity-50'}
                          >
                            <option value="">Selecciona equipo</option>
                            {teamOptions.map((team) => (
                              <option key={team.teamCode} value={team.teamCode}>
                                {formatTeamLabel(team)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid gap-1.5">
                          <span className="text-xs font-medium text-muted-foreground">
                            Jugadores{' '}
                            <span className="font-normal">
                              ({selectedPlayerIds.length} seleccionados, mín. 2)
                            </span>
                          </span>
                          <div className="max-h-48 overflow-auto rounded-md border border-input bg-background p-2">
                            {playerOptions.length > 0 ? (
                              playerOptions.map((player) => {
                                const checked = selectedPlayerIds.includes(player.playerId);
                                return (
                                  <label
                                    key={player.playerId}
                                    className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/50"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() =>
                                        setSelectedPlayerIds((prev) =>
                                          checked
                                            ? prev.filter((id) => id !== player.playerId)
                                            : [...prev, player.playerId],
                                        )
                                      }
                                    />
                                    <span className="flex flex-col">
                                      <span>{player.fullName}</span>
                                      <span className="text-xs text-muted-foreground">
                                        {[
                                          player.shirtNumber ? `#${player.shirtNumber}` : null,
                                          player.position ?? player.preferredPosition,
                                          playerScope === 'MATCH' ? player.teamCode : null,
                                        ].filter(Boolean).join(' · ')}
                                      </span>
                                    </span>
                                  </label>
                                );
                              })
                            ) : (
                              <p className="py-3 text-center text-xs text-muted-foreground">
                                {playerScope === 'TEAM' && !selectedPlayerTeamCode
                                  ? 'Selecciona un equipo para ver jugadores.'
                                  : playerScope === 'TEAM' && selectedPlayerTeamCode
                                  ? 'Este equipo no tiene jugadores registrados en el torneo.'
                                  : 'No hay jugadores disponibles para este partido.'}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </FormSection>

            <div className="border-t border-white/[0.08]" />

            {/* Section 3: Configuración */}
            <FormSection label="Configuración">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <label htmlFor="new-points" className="text-sm font-medium text-foreground">
                    Puntos
                  </label>
                  <Input
                    id="new-points"
                    type="number"
                    min={0}
                    placeholder="1"
                    value={newQuestion.points}
                    onChange={(e) => setNewQuestion((prev) => ({ ...prev, points: e.target.value }))}
                    className="bg-background/70"
                  />
                </div>

                <div className="grid gap-1.5">
                  <label htmlFor="new-lock-at" className="text-sm font-medium text-foreground">
                    Bloquear predicciones en{' '}
                    <span className="text-xs font-normal text-muted-foreground">(opcional)</span>
                  </label>
                  <Input
                    id="new-lock-at"
                    type="datetime-local"
                    value={newQuestion.lockAt}
                    onChange={(e) => setNewQuestion((prev) => ({ ...prev, lockAt: e.target.value }))}
                    className="bg-background/70"
                  />
                </div>
              </div>
            </FormSection>

            <div className="border-t border-white/[0.08]" />

            {/* Section 4: Publicación */}
            <FormSection label="Publicación">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={newQuestion.isPublished}
                  onChange={(e) => setNewQuestion((prev) => ({ ...prev, isPublished: e.target.checked }))}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">
                    Publicar inmediatamente
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {newQuestion.isPublished
                      ? 'Los usuarios verán esta pregunta al instante.'
                      : 'Se guardará como borrador, no visible para usuarios.'}
                  </p>
                </div>
              </label>
            </FormSection>

            {/* Submit */}
            <div className="flex justify-end border-t border-white/[0.08] pt-3">
              <Button onClick={() => void createQuestion()} disabled={creating} className="gap-2">
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {creating
                  ? 'Creando...'
                  : newQuestion.isPublished
                  ? 'Crear y publicar'
                  : 'Crear borrador'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Existing questions ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <CardTitle>Preguntas existentes</CardTitle>
            {questions.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {resolvedCount} de {questions.length} resueltas
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent className="grid gap-3">
          {questions.length === 0 && (
            <StatePanel variant="empty" description="No hay preguntas para este partido." />
          )}

          {questions.map((question) => {
            const correctOption = question.options.find((o) => o.id === question.correctOptionId);
            const pendingLabel =
              question.options.find((o) => o.id === (selectedOption[question.id] ?? ''))?.label ?? '—';
            const isWorking = workingId === question.id;
            const isPublishWorking = publishWorkingId === question.id;
            const isBusy = isWorking || isPublishWorking;

            return (
              <article
                key={question.id}
                className={`grid gap-3 rounded-xl border p-4 transition-colors ${
                  question.isResolved
                    ? 'border-emerald-400/25 bg-emerald-500/10'
                    : 'border-white/[0.08] bg-surface'
                }`}
              >
                {/* Row 1: status badges */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {question.isResolved ? (
                    <Badge variant="success" className="text-[11px]">Resuelta</Badge>
                  ) : (
                    <Badge variant="muted" className="text-[11px]">Pendiente</Badge>
                  )}
                  {question.isPublished ? (
                    <Badge variant="success" className="text-[11px]">Publicada</Badge>
                  ) : (
                    <Badge variant="warning" className="text-[11px]">Borrador</Badge>
                  )}
                  <Badge variant="muted" className="text-[11px]">
                    {TYPE_LABELS[question.answerType]}
                  </Badge>
                  {question.pointsOverride !== null && (
                    <Badge variant="muted" className="text-[11px]">
                      {question.pointsOverride} pts
                    </Badge>
                  )}
                </div>

                {/* Row 2: editable enunciado */}
                <div className="grid gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">Enunciado</span>
                  <Input
                    value={editingPrompt[question.id] ?? ''}
                    onChange={(e) =>
                      setEditingPrompt((prev) => ({ ...prev, [question.id]: e.target.value }))
                    }
                    className="bg-background/70"
                  />
                </div>

                {/* Row 3: options as readable pills */}
                {question.options.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {question.options.map((opt) => {
                      const displayName = opt.player?.fullName ?? opt.label;
                      const meta = opt.player
                        ? [
                            opt.player.shirtNumber != null ? `#${opt.player.shirtNumber}` : null,
                            opt.player.position ?? opt.player.preferredPosition,
                            opt.player.teamName,
                          ]
                            .filter(Boolean)
                            .join(' · ')
                        : null;
                      return (
                        <span
                          key={opt.id}
                          className={`inline-flex flex-col rounded-xl px-2.5 py-1.5 text-xs font-medium ${
                            opt.id === question.correctOptionId
                              ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          <span className="flex items-center gap-1">
                            {opt.id === question.correctOptionId && (
                              <CheckCircle2 className="h-3 w-3 shrink-0" />
                            )}
                            {displayName}
                          </span>
                          {meta && (
                            <span className="text-[10px] font-normal opacity-70">{meta}</span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Row 4: resolved answer banner */}
                {question.isResolved && correctOption && (
                  <div className="flex flex-col gap-0.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                      <span className="text-xs font-semibold text-emerald-300">Respuesta correcta:</span>
                      <span className="font-bold text-emerald-200">
                        {correctOption.player?.fullName ?? correctOption.label}
                      </span>
                    </div>
                    {correctOption.player && (() => {
                      const meta = [
                        correctOption.player.shirtNumber != null ? `#${correctOption.player.shirtNumber}` : null,
                        correctOption.player.position ?? correctOption.player.preferredPosition,
                        correctOption.player.teamName,
                      ].filter(Boolean).join(' · ');
                      return meta ? (
                        <span className="ml-5 text-[11px] text-emerald-400/70">{meta}</span>
                      ) : null;
                    })()}
                  </div>
                )}

                {/* Row 5: resolve selector (only when pending) */}
                {!question.isResolved && (
                  <div className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Seleccionar respuesta correcta
                    </span>
                    <select
                      value={selectedOption[question.id] ?? ''}
                      onChange={(e) =>
                        setSelectedOption((prev) => ({ ...prev, [question.id]: e.target.value }))
                      }
                      className={cn(SELECT_CLASS, 'bg-background/70')}
                    >
                      {question.options.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.player?.fullName ?? option.label}
                          {option.player?.shirtNumber != null ? ` (#${option.player.shirtNumber})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Row 6: action buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.08] pt-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void saveQuestion(question.id)}
                      disabled={isBusy}
                      className="gap-1.5"
                    >
                      {isWorking ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      Guardar texto
                    </Button>

                    {!question.isResolved && (
                      <button
                        onClick={() => void togglePublish(question)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPublishWorking ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : question.isPublished ? (
                          <EyeOff className="h-3 w-3" />
                        ) : (
                          <Eye className="h-3 w-3" />
                        )}
                        {question.isPublished ? 'Mover a borrador' : 'Publicar'}
                      </button>
                    )}

                    {!question.isResolved && (
                      <ConfirmActionButton
                        size="sm"
                        variant="outline"
                        intent="destructive"
                        disabled={isBusy}
                        label={<><Trash2 className="h-3.5 w-3.5" />Eliminar</>}
                        confirmLabel="Sí, eliminar"
                        title="Eliminar pregunta"
                        description="Se eliminará la pregunta y todas las respuestas de los usuarios. Esta acción no se puede deshacer."
                        onConfirm={() => deleteQuestion(question.id)}
                        buttonClassName="gap-1.5 border-rose-400/30 text-rose-400 hover:border-rose-400/50 hover:bg-rose-500/10 hover:text-rose-300"
                        panelClassName="w-full sm:max-w-[400px]"
                      />
                    )}
                  </div>

                  {question.isResolved ? (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Resuelta — no se puede cambiar
                    </div>
                  ) : (
                    <ConfirmActionButton
                      size="sm"
                      disabled={isBusy}
                      label="Resolver pregunta"
                      confirmLabel="Sí, resolver"
                      title="Confirmar resolución"
                      description={`La pregunta quedará resuelta con "${pendingLabel}". Esta acción marca el resultado correcto para el scoring.`}
                      onConfirm={() => resolveQuestion(question.id)}
                      panelClassName="w-full sm:max-w-[380px]"
                    />
                  )}
                </div>
              </article>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
