'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Calendar, CalendarDays, CheckCircle2, Check, ChevronDown, HelpCircle, Replace, Search, Trophy, Users, X } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { formatMatchKickoff } from '@/lib/format';
import { cn, normalizeSearchText } from '@/lib/utils';
import { getPlayerDisplayName, matchesPlayerSearch } from '@/lib/player-utils';
import { useAuth } from '@/providers/auth-provider';
import { AdminMatch, AdminTournamentPlayer } from '@/types/api';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Input } from '@/components/ui/input';
import { StatePanel } from '@/components/ui/state-panel';
import { TeamLabel } from '@/components/ui/team-label';

type ScoreDraft = {
  homeScore: string;
  awayScore: string;
};

const groupLabels = {
  NO_GROUP: 'Eliminatorias',
} as const;

const STATUS_LABELS: Record<AdminMatch['status'], string> = {
  SCHEDULED: 'Programado',
  LIVE: 'En juego',
  FINISHED: 'Finalizado',
  POSTPONED: 'Postergado',
  CANCELLED: 'Cancelado',
};


function getSideLabel(match: AdminMatch, side: 'home' | 'away') {
  if (side === 'home') {
    return match.homeTournamentTeam?.team.name ?? match.homeSlotLabel ?? 'TBD';
  }
  return match.awayTournamentTeam?.team.name ?? match.awaySlotLabel ?? 'TBD';
}

function getStatusVariant(status: AdminMatch['status']): BadgeVariant {
  if (status === 'FINISHED') return 'success';
  if (status === 'LIVE') return 'live';
  if (status === 'CANCELLED') return 'danger';
  if (status === 'POSTPONED') return 'warning';
  return 'muted';
}

function getRoundLabel(match: AdminMatch) {
  return match.roundLabel ?? match.stage ?? 'Sin round';
}

function getTeamProps(team: AdminMatch['homeTournamentTeam']) {
  if (!team) return null;
  return { name: team.team.name, code: team.team.code, flagEmoji: team.team.flagEmoji };
}

export default function TournamentMatchesPage() {
  const params = useParams<{ tournamentId: string }>();
  const tournamentId = params?.tournamentId ?? '';
  const { token } = useAuth();
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [tournamentName, setTournamentName] = useState('Torneo');
  const [drafts, setDrafts] = useState<Record<string, ScoreDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [bestThirdsActual, setBestThirdsActual] = useState<string[]>([]);
  const [actualResultsSaving, setActualResultsSaving] = useState(false);
  const [actualResultsMsg, setActualResultsMsg] = useState<string | null>(null);
  const [bestThirdsSearch, setBestThirdsSearch] = useState('');
  const BEST_THIRDS_REQUIRED = 8;

  // ── Actual results state ──
  const [players, setPlayers] = useState<AdminTournamentPlayer[]>([]);
  const [actualChampionId,   setActualChampionId]   = useState<string | null>(null);
  const [actualRunnerUpId,   setActualRunnerUpId]    = useState<string | null>(null);
  const [actualThirdPlaceId, setActualThirdPlaceId]  = useState<string | null>(null);
  const [actualTopScorerId,  setActualTopScorerId]   = useState<string | null>(null);
  const [actualGoldenBallId, setActualGoldenBallId]  = useState<string | null>(null);
  const [actualGoldenGloveId, setActualGoldenGloveId] = useState<string | null>(null);

  // ── Pre-torneo section collapse + dirty tracking ──
  const [preTourneyExpanded, setPreTourneyExpanded] = useState(false);
  const [savedSnapshot, setSavedSnapshot] = useState<{
    championId: string | null;
    runnerUpId: string | null;
    thirdPlaceId: string | null;
    topScorerId: string | null;
    goldenBallId: string | null;
    goldenGloveId: string | null;
    bestThirds: string[];
  } | null>(null);

  // ── Schedule editing state ──
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [savingScheduleId, setSavingScheduleId] = useState<string | null>(null);

  // ── Team assignment state ──
  const [teamEditingId, setTeamEditingId] = useState<string | null>(null);
  const [teamDrafts, setTeamDrafts] = useState<Record<string, { homeId: string | null; awayId: string | null }>>({});
  const [savingTeamsId, setSavingTeamsId] = useState<string | null>(null);

  useEffect(() => {
    if (!lastSavedId) return;
    const timer = setTimeout(() => setLastSavedId(null), 3000);
    return () => clearTimeout(timer);
  }, [lastSavedId]);

  const loadMatches = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [data, playersData, actualResults] = await Promise.all([
        api.adminListTournamentMatches(tournamentId, token),
        api.adminListTournamentPlayers(tournamentId, token).catch(() => [] as AdminTournamentPlayer[]),
        api.adminGetTournamentActualResults(tournamentId, token).catch(() => null),
      ]);

      setTournamentName(data.tournament.name);
      setMatches(data.matches);
      setPlayers(playersData);

      if (actualResults) {
        const bestThirds = actualResults.actualBestThirdsTeamIds ?? [];
        setBestThirdsActual(bestThirds);
        setActualChampionId(actualResults.actualChampionTournamentTeamId);
        setActualRunnerUpId(actualResults.actualRunnerUpTournamentTeamId);
        setActualThirdPlaceId(actualResults.actualThirdPlaceTournamentTeamId);
        setActualTopScorerId(actualResults.actualTopScorerTournamentPlayerId);
        setActualGoldenBallId(actualResults.actualGoldenBallTournamentPlayerId);
        setActualGoldenGloveId(actualResults.actualGoldenGloveTournamentPlayerId);
        setSavedSnapshot({
          championId:  actualResults.actualChampionTournamentTeamId,
          runnerUpId:  actualResults.actualRunnerUpTournamentTeamId,
          thirdPlaceId: actualResults.actualThirdPlaceTournamentTeamId,
          topScorerId:  actualResults.actualTopScorerTournamentPlayerId,
          goldenBallId: actualResults.actualGoldenBallTournamentPlayerId,
          goldenGloveId: actualResults.actualGoldenGloveTournamentPlayerId,
          bestThirds,
        });
      }

      setDrafts(
        Object.fromEntries(
          data.matches.map((match) => [
            match.id,
            {
              homeScore: match.homeScore === null ? '' : String(match.homeScore),
              awayScore: match.awayScore === null ? '' : String(match.awayScore),
            },
          ]),
        ),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar los matches del torneo.');
    } finally {
      setLoading(false);
    }
  }, [token, tournamentId]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const groupOptions = useMemo(() => {
    const groups = new Set<string>();
    matches.forEach((match) => {
      if (match.group?.code) groups.add(match.group.code);
    });
    return Array.from(groups).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const sorted = [...matches].sort(
      (a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime(),
    );

    const queryTokens = normalizeSearchText(search).split(/\s+/).filter(Boolean);

    return sorted.filter((match) => {
      if (groupFilter !== 'ALL') {
        if (groupFilter === groupLabels.NO_GROUP) {
          if (match.group?.code) return false;
        } else if (match.group?.code !== groupFilter) {
          return false;
        }
      }

      if (queryTokens.length === 0) return true;

      const tokens = normalizeSearchText(
        [
          match.matchNumber ? `#${match.matchNumber}` : null,
          match.matchNumber ? String(match.matchNumber) : null,
          match.roundLabel,
          match.stage,
          match.group?.code ? `Grupo ${match.group.code}` : null,
          match.homeTournamentTeam?.team.name,
          match.homeTournamentTeam?.team.code,
          match.awayTournamentTeam?.team.name,
          match.awayTournamentTeam?.team.code,
        ]
          .filter(Boolean)
          .join(' '),
      );

      return queryTokens.every((token) => tokens.includes(token));
    });
  }, [groupFilter, matches, search]);

  const updateDraft = (matchId: string, field: keyof ScoreDraft, value: string) => {
    setDrafts((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [field]: value } }));
  };

  const saveResult = async (matchId: string) => {
    if (!token) return;
    const draft = drafts[matchId];
    if (!draft || draft.homeScore === '' || draft.awayScore === '') {
      setError('Debes completar ambos scores para guardar.');
      return;
    }

    const homeScore = Number(draft.homeScore);
    const awayScore = Number(draft.awayScore);
    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      setError('Los scores deben ser numéricos.');
      return;
    }

    setSavingId(matchId);
    setError(null);
    setSuccess(null);
    try {
      await api.adminUpdateMatchResult(matchId, { homeScore, awayScore, status: 'FINISHED' }, token);
      await loadMatches();
      setSuccess('Resultado guardado y partido marcado como Finalizado.');
      setLastSavedId(matchId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el resultado.');
    } finally {
      setSavingId(null);
    }
  };

  const saveSchedule = async (matchId: string, kickoffAt: string) => {
    if (!token) return;
    setSavingScheduleId(matchId);
    setError(null);
    try {
      const updated = await api.adminUpdateMatchSchedule(matchId, kickoffAt, token);
      setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, kickoffAt: updated.kickoffAt } : m));
      setEditingScheduleId(null);
      setLastSavedId(matchId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el horario.');
    } finally {
      setSavingScheduleId(null);
    }
  };

  const updateTeamDraft = (
    matchId: string,
    side: 'homeId' | 'awayId',
    value: string | null,
  ) => {
    setTeamDrafts((prev) => ({
      ...prev,
      [matchId]: { ...(prev[matchId] ?? { homeId: null, awayId: null }), [side]: value },
    }));
  };

  const saveMatchTeams = async (matchId: string) => {
    if (!token) return;
    const draft = teamDrafts[matchId] ?? { homeId: null, awayId: null };
    setSavingTeamsId(matchId);
    setError(null);
    try {
      const updated = await api.adminUpdateMatchTeams(
        matchId,
        { homeTournamentTeamId: draft.homeId, awayTournamentTeamId: draft.awayId },
        token,
      );
      setMatches((prev) =>
        prev.map((m) =>
          m.id === matchId
            ? { ...m, homeTournamentTeam: updated.homeTournamentTeam, awayTournamentTeam: updated.awayTournamentTeam }
            : m,
        ),
      );
      setTeamEditingId(null);
      setLastSavedId(matchId);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo asignar los equipos.');
    } finally {
      setSavingTeamsId(null);
    }
  };

  const saveActualResults = async () => {
    if (!token) return;

    // Validate: no duplicate teams in podio
    const podioIds = [actualChampionId, actualRunnerUpId, actualThirdPlaceId].filter(Boolean);
    if (new Set(podioIds).size !== podioIds.length) {
      setActualResultsMsg('❌ El podio no puede tener equipos repetidos (campeón, subcampeón y tercer puesto deben ser distintos).');
      return;
    }

    setActualResultsSaving(true);
    setActualResultsMsg(null);
    try {
      await api.adminSetTournamentActualResults(
        tournamentId,
        {
          actualChampionTournamentTeamId:   actualChampionId,
          actualRunnerUpTournamentTeamId:   actualRunnerUpId,
          actualThirdPlaceTournamentTeamId: actualThirdPlaceId,
          actualTopScorerTournamentPlayerId:  actualTopScorerId,
          actualGoldenBallTournamentPlayerId: actualGoldenBallId,
          actualGoldenGloveTournamentPlayerId: actualGoldenGloveId,
          actualBestThirdsTeamIds: bestThirdsActual.length > 0 ? bestThirdsActual : null,
        },
        token,
      );
      setSavedSnapshot({
        championId:   actualChampionId,
        runnerUpId:   actualRunnerUpId,
        thirdPlaceId: actualThirdPlaceId,
        topScorerId:  actualTopScorerId,
        goldenBallId: actualGoldenBallId,
        goldenGloveId: actualGoldenGloveId,
        bestThirds:   [...bestThirdsActual],
      });
      setActualResultsMsg('✅ Resultados guardados. Recalcula el scoring para aplicar los puntos.');
    } catch (err) {
      setActualResultsMsg(`❌ ${err instanceof ApiError ? err.message : 'Error al guardar'}`);
    } finally {
      setActualResultsSaving(false);
    }
  };

  const allTournamentTeams = useMemo(() => {
    const map = new Map<string, { ttId: string; name: string; code: string; flagEmoji: string | null }>();
    matches.forEach((m) => {
      if (m.homeTournamentTeam) {
        map.set(m.homeTournamentTeam.id, {
          ttId: m.homeTournamentTeam.id,
          name: m.homeTournamentTeam.team.name,
          code: m.homeTournamentTeam.team.code,
          flagEmoji: m.homeTournamentTeam.team.flagEmoji,
        });
      }
      if (m.awayTournamentTeam) {
        map.set(m.awayTournamentTeam.id, {
          ttId: m.awayTournamentTeam.id,
          name: m.awayTournamentTeam.team.name,
          code: m.awayTournamentTeam.team.code,
          flagEmoji: m.awayTournamentTeam.team.flagEmoji,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [matches]);

  const filteredBestThirdsTeams = useMemo(() => {
    const q = normalizeSearchText(bestThirdsSearch);
    return allTournamentTeams.filter(
      (t) => normalizeSearchText(t.name).includes(q) || normalizeSearchText(t.code).includes(q),
    );
  }, [allTournamentTeams, bestThirdsSearch]);

  if (loading) {
    return <StatePanel variant="loading" description="Cargando matches del torneo..." />;
  }

  if (error && matches.length === 0) {
    return <StatePanel variant="error" description={error} />;
  }

  return (
    <div className="grid gap-4">

    {/* ── Resultados oficiales de pre-torneo ─────────────────────────────── */}
    {allTournamentTeams.length > 0 && (() => {
      const podioCount = [actualChampionId, actualRunnerUpId, actualThirdPlaceId].filter(Boolean).length;
      const premiosCount = [actualTopScorerId, actualGoldenBallId, actualGoldenGloveId].filter(Boolean).length;
      const isDirty = savedSnapshot !== null && (
        savedSnapshot.championId   !== actualChampionId   ||
        savedSnapshot.runnerUpId   !== actualRunnerUpId   ||
        savedSnapshot.thirdPlaceId !== actualThirdPlaceId ||
        savedSnapshot.topScorerId  !== actualTopScorerId  ||
        savedSnapshot.goldenBallId !== actualGoldenBallId ||
        savedSnapshot.goldenGloveId !== actualGoldenGloveId ||
        JSON.stringify([...savedSnapshot.bestThirds].sort()) !== JSON.stringify([...bestThirdsActual].sort())
      );

      return (
        <Card>
          {/* ── Compact header — always visible ── */}
          <button
            type="button"
            onClick={() => setPreTourneyExpanded((v) => !v)}
            className="w-full text-left"
            aria-expanded={preTourneyExpanded}
          >
            <CardHeader className="gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Trophy className="h-4 w-4 shrink-0 text-primary" />
                  <CardTitle className="text-base truncate">Resultados oficiales de pre-torneo</CardTitle>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isDirty && (
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                      Sin guardar
                    </span>
                  )}
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 text-muted-foreground transition-transform duration-200',
                      preTourneyExpanded && 'rotate-180',
                    )}
                    aria-hidden="true"
                  />
                </div>
              </div>

              {/* Summary chips — always visible */}
              <div className="flex flex-wrap items-center gap-2">
                <SummaryChip
                  label="Podio"
                  filled={podioCount}
                  total={3}
                />
                <SummaryChip
                  label="Premios"
                  filled={premiosCount}
                  total={3}
                />
                <SummaryChip
                  label="Terceros"
                  filled={bestThirdsActual.length}
                  total={BEST_THIRDS_REQUIRED}
                />
                {isDirty && (
                  <span className="sm:hidden inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                    Sin guardar
                  </span>
                )}
              </div>
            </CardHeader>
          </button>

          {/* ── Expandable content ── */}
          {preTourneyExpanded && (
            <CardContent className="grid gap-6 border-t border-border/40 pt-6">

              {/* ── Podio ── */}
              <div className="grid gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Podio</p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <SingleTeamPicker
                    label="🥇 Campeón"
                    value={actualChampionId}
                    teams={allTournamentTeams}
                    onChange={setActualChampionId}
                    disabledIds={[actualRunnerUpId, actualThirdPlaceId].filter((x): x is string => x !== null)}
                  />
                  <SingleTeamPicker
                    label="🥈 Subcampeón"
                    value={actualRunnerUpId}
                    teams={allTournamentTeams}
                    onChange={setActualRunnerUpId}
                    disabledIds={[actualChampionId, actualThirdPlaceId].filter((x): x is string => x !== null)}
                  />
                  <SingleTeamPicker
                    label="🥉 Tercer puesto"
                    value={actualThirdPlaceId}
                    teams={allTournamentTeams}
                    onChange={setActualThirdPlaceId}
                    disabledIds={[actualChampionId, actualRunnerUpId].filter((x): x is string => x !== null)}
                  />
                </div>
              </div>

              <div className="h-px bg-border/40" />

              {/* ── Premios individuales ── */}
              <div className="grid gap-3">
                <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">Premios individuales</p>
                {players.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic">
                    Sin jugadores cargados. Asegúrate de haber corrido el seed de producción.
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-3">
                    <SinglePlayerPicker
                      label="⚽ Goleador (Bota de Oro)"
                      value={actualTopScorerId}
                      players={players}
                      onChange={setActualTopScorerId}
                    />
                    <SinglePlayerPicker
                      label="🏅 Mejor jugador (Balón de Oro)"
                      value={actualGoldenBallId}
                      players={players}
                      onChange={setActualGoldenBallId}
                    />
                    <SinglePlayerPicker
                      label="🧤 Mejor arquero (Guante de Oro)"
                      value={actualGoldenGloveId}
                      players={players}
                      onChange={setActualGoldenGloveId}
                      onlyGk
                    />
                  </div>
                )}
              </div>

              <div className="h-px bg-border/40" />

              {/* ── Mejores terceros ── */}
              <div className="grid gap-3">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
                    <Users className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                    Mejores terceros clasificados
                  </p>
                  <span className={cn(
                    'ml-auto text-xs font-bold tabular-nums',
                    bestThirdsActual.length === BEST_THIRDS_REQUIRED ? 'text-emerald-400' : 'text-muted-foreground',
                  )}>
                    {bestThirdsActual.length}/{BEST_THIRDS_REQUIRED}
                  </span>
                </div>

                {bestThirdsActual.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {bestThirdsActual.map((ttId) => {
                      const t = allTournamentTeams.find((x) => x.ttId === ttId);
                      if (!t) return null;
                      return (
                        <button
                          key={ttId}
                          type="button"
                          onClick={() => setBestThirdsActual((prev) => prev.filter((x) => x !== ttId))}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-rose-500/15 hover:text-rose-400"
                        >
                          {t.flagEmoji && <span>{t.flagEmoji}</span>}
                          {t.code}
                          <X className="h-3 w-3 ml-0.5" aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Buscar equipo..."
                    value={bestThirdsSearch}
                    onChange={(e) => setBestThirdsSearch(e.target.value)}
                    className="h-9 w-full rounded-xl border border-input bg-background/70 py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25"
                  />
                </div>

                <div className="max-h-44 overflow-y-auto rounded-xl border border-border/40 bg-background/60 p-1">
                  <div className="grid grid-cols-2 gap-0.5 sm:grid-cols-3 md:grid-cols-4">
                    {filteredBestThirdsTeams.map((t) => {
                      const isSelected = bestThirdsActual.includes(t.ttId);
                      const isDisabled = !isSelected && bestThirdsActual.length >= BEST_THIRDS_REQUIRED;
                      return (
                        <button
                          key={t.ttId}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            if (isSelected) {
                              setBestThirdsActual((prev) => prev.filter((x) => x !== t.ttId));
                            } else if (bestThirdsActual.length < BEST_THIRDS_REQUIRED) {
                              setBestThirdsActual((prev) => [...prev, t.ttId]);
                            }
                          }}
                          className={cn(
                            'flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors',
                            isSelected ? 'bg-primary text-primary-foreground' :
                            isDisabled ? 'cursor-not-allowed text-muted-foreground/30' :
                            'text-foreground hover:bg-muted',
                          )}
                        >
                          {t.flagEmoji && <span className="text-sm leading-none">{t.flagEmoji}</span>}
                          <span className="truncate">{t.name}</span>
                          {isSelected && <Check className="ml-auto h-3 w-3 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Feedback + save ── */}
              {actualResultsMsg && (
                <p className={cn(
                  'text-xs font-medium',
                  actualResultsMsg.startsWith('✅') ? 'text-emerald-400' : 'text-rose-400',
                )}>
                  {actualResultsMsg}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={saveActualResults}
                  disabled={actualResultsSaving}
                  className="w-fit"
                >
                  {actualResultsSaving ? 'Guardando...' : 'Guardar resultados oficiales'}
                </Button>
                {isDirty && (
                  <span className="text-[11px] font-medium text-amber-400">
                    Cambios sin guardar
                  </span>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      );
    })()}

    <Card>
      <CardHeader className="gap-3">
        <Link
          href="/admin/tournaments"
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a torneos
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle>Matches — {tournamentName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {filteredMatches.length} de {matches.length} partidos
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid gap-3 rounded-2xl border border-white/[0.08] bg-surface p-4 shadow-inner-subtle">
          <div className="grid gap-3 lg:grid-cols-[2fr_1fr] lg:items-end">
            <div className="grid gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Buscar
              </p>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ej: MEX, Grupo A, Matchday 1, #12"
                className="bg-background/70"
              />
            </div>
            <div className="grid gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Grupo / Fase
              </p>
              <select
                className="h-11 w-full rounded-md border border-input bg-background/70 px-3 text-sm text-foreground shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
              >
                <option value="ALL">Todos</option>
                {groupOptions.map((group) => (
                  <option key={group} value={group}>
                    Grupo {group}
                  </option>
                ))}
                <option value={groupLabels.NO_GROUP}>{groupLabels.NO_GROUP}</option>
              </select>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3">
        {/* Global feedback — aria-live so screen readers announce it */}
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

        {matches.length === 0 && (
          <StatePanel variant="empty" description="Este torneo no tiene matches configurados." />
        )}
        {matches.length > 0 && filteredMatches.length === 0 && (
          <StatePanel variant="empty" description="No hay matches con esos filtros." />
        )}

        {filteredMatches.map((match) => {
          const isFinished = match.status === 'FINISHED';
          const homeTeam = getTeamProps(match.homeTournamentTeam);
          const awayTeam = getTeamProps(match.awayTournamentTeam);
          const homeLabel = getSideLabel(match, 'home');
          const awayLabel = getSideLabel(match, 'away');
          const justSaved = lastSavedId === match.id;
          const draft = drafts[match.id];
          const hasValidScore =
            draft?.homeScore !== undefined && draft.homeScore !== '' &&
            draft?.awayScore !== undefined && draft.awayScore !== '';

          return (
            <article
              key={match.id}
              className={`grid gap-3 rounded-xl border p-4 shadow-sm transition-colors ${
                isFinished ? 'border-emerald-400/25 bg-emerald-500/10' : 'border-white/[0.08] bg-surface'
              }`}
            >
              {/* Row 1: status badges + date */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant={getStatusVariant(match.status)} className="text-[11px]">
                    {STATUS_LABELS[match.status]}
                  </Badge>
                  <Badge variant="muted" className="text-[11px]">
                    {getRoundLabel(match)}
                  </Badge>
                  {match.matchNumber !== null && (
                    <Badge variant="muted" className="text-[11px]">
                      #{match.matchNumber}
                    </Badge>
                  )}
                  {match.group?.code && (
                    <Badge variant="muted" className="text-[11px]">
                      Grupo {match.group.code}
                    </Badge>
                  )}
                </div>
                <time className="flex items-center gap-1.5 text-sm font-semibold text-foreground" dateTime={match.kickoffAt}>
                  <CalendarDays className="h-4 w-4 shrink-0 text-primary/60" aria-hidden="true" />
                  {formatMatchKickoff(match.kickoffAt)}
                </time>
              </div>

              {/* Row 2: team names */}
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  {homeTeam ? (
                    <TeamLabel
                      name={homeTeam.name}
                      code={homeTeam.code}
                      flagEmoji={homeTeam.flagEmoji}
                      format="full"
                      className="text-sm font-bold text-foreground"
                    />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">{homeLabel}</span>
                  )}
                </div>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">vs</span>
                <div className="min-w-0 flex-1 text-right">
                  {awayTeam ? (
                    <TeamLabel
                      name={awayTeam.name}
                      code={awayTeam.code}
                      flagEmoji={awayTeam.flagEmoji}
                      format="full"
                      className="text-sm font-bold text-foreground"
                    />
                  ) : (
                    <span className="text-sm font-bold text-muted-foreground">{awayLabel}</span>
                  )}
                </div>
              </div>

              {/* Row 3: FINISHED banner (when score is already official) */}
              {isFinished && match.homeScore !== null && match.awayScore !== null && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-300">Resultado oficial:</span>
                  <span className="font-bold tabular-nums text-emerald-200">
                    {match.homeScore} – {match.awayScore}
                  </span>
                  <span className="ml-auto text-[10px] text-emerald-400/70">
                    Editable si necesitas corregir
                  </span>
                </div>
              )}

              {/* Row 3c: knockout team assignment panel */}
              {match.stage !== 'GROUP' && teamEditingId === match.id && (
                <div className="grid gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="text-xs font-bold text-primary">Asignar clasificados</p>
                    {(match.homeSlotLabel || match.awaySlotLabel) && (
                      <span className="text-[11px] font-mono text-muted-foreground">
                        Slot: {match.homeSlotLabel ?? '?'} vs {match.awaySlotLabel ?? '?'}
                      </span>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <SingleTeamPicker
                      label="Local"
                      value={teamDrafts[match.id]?.homeId ?? null}
                      teams={allTournamentTeams}
                      onChange={(ttId) => updateTeamDraft(match.id, 'homeId', ttId)}
                      disabledIds={[teamDrafts[match.id]?.awayId].filter((x): x is string => x !== null)}
                    />
                    <SingleTeamPicker
                      label="Visitante"
                      value={teamDrafts[match.id]?.awayId ?? null}
                      teams={allTournamentTeams}
                      onChange={(ttId) => updateTeamDraft(match.id, 'awayId', ttId)}
                      disabledIds={[teamDrafts[match.id]?.homeId].filter((x): x is string => x !== null)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={savingTeamsId === match.id}
                      onClick={() => void saveMatchTeams(match.id)}
                    >
                      {savingTeamsId === match.id ? 'Guardando...' : 'Guardar equipos'}
                    </Button>
                    <button
                      type="button"
                      onClick={() => setTeamEditingId(null)}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Row 4: score inputs with team labels */}
              <div className="grid gap-2 sm:grid-cols-[1fr_20px_1fr] sm:items-end">
                <div className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Local — {homeLabel}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={drafts[match.id]?.homeScore ?? ''}
                    onChange={(event) => updateDraft(match.id, 'homeScore', event.target.value)}
                    placeholder="0"
                    className="h-10 bg-background/70 text-center text-base font-bold"
                  />
                </div>
                <span className="hidden pb-1.5 text-center text-sm font-bold text-muted-foreground sm:block">
                  –
                </span>
                <div className="grid gap-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Visitante — {awayLabel}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    value={drafts[match.id]?.awayScore ?? ''}
                    onChange={(event) => updateDraft(match.id, 'awayScore', event.target.value)}
                    placeholder="0"
                    className="h-10 bg-background/70 text-center text-base font-bold"
                  />
                </div>
              </div>

              {/* Row 5: actions */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/matches/${match.id}/questions`}>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5" />
                      Preguntas bonus
                      {match._count.questions > 0 && (
                        <span className="rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
                          {match._count.questions}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setEditingScheduleId(match.id)}
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Editar horario
                  </Button>
                  {match.stage !== 'GROUP' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        'gap-1.5',
                        teamEditingId === match.id && 'border-primary/50 bg-primary/10 text-primary',
                      )}
                      onClick={() => {
                        if (teamEditingId === match.id) {
                          setTeamEditingId(null);
                        } else {
                          setTeamDrafts((prev) => ({
                            ...prev,
                            [match.id]: {
                              homeId: match.homeTournamentTeam?.id ?? null,
                              awayId: match.awayTournamentTeam?.id ?? null,
                            },
                          }));
                          setTeamEditingId(match.id);
                        }
                      }}
                    >
                      <Replace className="h-3.5 w-3.5" />
                      Asignar equipos
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {justSaved && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Guardado
                    </span>
                  )}
                  <ConfirmActionButton
                    size="sm"
                    disabled={savingId === match.id || !hasValidScore}
                    label={savingId === match.id ? 'Guardando...' : isFinished ? 'Actualizar resultado' : 'Guardar y cerrar'}
                    confirmLabel="Sí, confirmar"
                    title="Confirmar resultado"
                    description={
                      hasValidScore
                        ? `${homeLabel} ${draft!.homeScore} – ${draft!.awayScore} ${awayLabel}. El partido quedará como Finalizado.`
                        : 'Ingresa el marcador de ambos equipos antes de confirmar.'
                    }
                    onConfirm={() => saveResult(match.id)}
                    panelClassName="w-full sm:max-w-[340px]"
                  />
                </div>
              </div>
            </article>
          );
        })}
      </CardContent>
    </Card>

    {/* ── DateTimePicker modal ── */}
    {editingScheduleId !== null &&
      matches.find((m) => m.id === editingScheduleId) != null && (
        <DateTimePicker
          value={matches.find((m) => m.id === editingScheduleId)!.kickoffAt}
          saving={savingScheduleId === editingScheduleId}
          onConfirm={(iso) => void saveSchedule(editingScheduleId, iso)}
          onClose={() => setEditingScheduleId(null)}
        />
      )}
    </div>
  );
}

// ── SingleTeamPicker ──────────────────────────────────────────────────────────

type TeamOption = { ttId: string; name: string; code: string; flagEmoji: string | null };

function SingleTeamPicker({
  label,
  value,
  teams,
  onChange,
  disabledIds = [],
}: {
  label: string;
  value: string | null;
  teams: TeamOption[];
  onChange: (ttId: string | null) => void;
  disabledIds?: string[];
}) {
  const [search, setSearch] = useState('');
  const selected = teams.find((t) => t.ttId === value);
  const filtered = teams.filter((t) => {
    const q = normalizeSearchText(search);
    return normalizeSearchText(t.name).includes(q) || normalizeSearchText(t.code).includes(q);
  });

  return (
    <div className="grid gap-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>

      {/* Current selection chip */}
      {selected ? (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {selected.flagEmoji && <span>{selected.flagEmoji}</span>}
            {selected.name}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Quitar selección"
            className="rounded p-0.5 text-muted-foreground hover:text-rose-400 transition-colors"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <p className="text-[11px] italic text-muted-foreground/50">Sin seleccionar</p>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-background/70 py-1.5 pl-8 pr-2 text-xs outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25"
        />
      </div>

      {/* Team list */}
      <div className="max-h-40 overflow-y-auto rounded-xl border border-border/40 bg-background/60 p-0.5">
        {filtered.length === 0 ? (
          <p className="px-2 py-2 text-center text-[11px] text-muted-foreground">Sin resultados</p>
        ) : (
          <div className="grid gap-0.5">
            {filtered.map((t) => {
              const isSelected = t.ttId === value;
              const isDisabled = disabledIds.includes(t.ttId);
              return (
                <button
                  key={t.ttId}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onChange(isSelected ? null : t.ttId)}
                  className={cn(
                    'flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs font-medium transition-colors',
                    isSelected && 'bg-primary text-primary-foreground',
                    !isSelected && isDisabled && 'cursor-not-allowed text-muted-foreground/30',
                    !isSelected && !isDisabled && 'text-foreground hover:bg-muted',
                  )}
                >
                  {t.flagEmoji && <span className="text-sm leading-none">{t.flagEmoji}</span>}
                  <span className="truncate">{t.name}</span>
                  {isSelected && <Check className="ml-auto h-3 w-3 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SinglePlayerPicker ────────────────────────────────────────────────────────

function SinglePlayerPicker({
  label,
  value,
  players,
  onChange,
  onlyGk = false,
}: {
  label: string;
  value: string | null;
  players: AdminTournamentPlayer[];
  onChange: (id: string | null) => void;
  onlyGk?: boolean;
}) {
  const [search, setSearch] = useState('');
  const pool = onlyGk ? players.filter((p) => p.isGoalkeeper) : players;
  const selected = pool.find((p) => p.id === value);
  const filtered = pool.filter((p) => {
    if (matchesPlayerSearch(p, search)) return true;
    const q = normalizeSearchText(search);
    return (
      normalizeSearchText(p.teamCode).includes(q) ||
      normalizeSearchText(p.teamName).includes(q)
    );
  });

  return (
    <div className="grid gap-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>

      {/* Current selection chip */}
      {selected ? (
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {selected.teamFlagEmoji && <span>{selected.teamFlagEmoji}</span>}
            {getPlayerDisplayName(selected)}
          </span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Quitar selección"
            className="rounded p-0.5 text-muted-foreground hover:text-rose-400 transition-colors"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <p className="text-[11px] italic text-muted-foreground/50">Sin seleccionar</p>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar jugador..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-full rounded-lg border border-input bg-background/70 py-1.5 pl-8 pr-2 text-xs outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25"
        />
      </div>

      {/* Player list */}
      <div className="max-h-40 overflow-y-auto rounded-xl border border-border/40 bg-background/60 p-0.5">
        {filtered.length === 0 ? (
          <p className="px-2 py-2 text-center text-[11px] text-muted-foreground">Sin resultados</p>
        ) : (
          <div className="grid gap-0.5">
            {filtered.map((p) => {
              const isSelected = p.id === value;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onChange(isSelected ? null : p.id)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors',
                    isSelected ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{getPlayerDisplayName(p)}</p>
                    {p.teamCode && (
                      <p className={cn('text-[10px]', isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                        {p.teamFlagEmoji} {p.teamCode}
                      </p>
                    )}
                  </div>
                  {isSelected && <Check className="h-3 w-3 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── SummaryChip ───────────────────────────────────────────────────────────────

function SummaryChip({ label, filled, total }: { label: string; filled: number; total: number }) {
  const complete = filled === total;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold',
        complete
          ? 'bg-emerald-500/15 text-emerald-400'
          : filled > 0
          ? 'bg-primary/10 text-primary'
          : 'bg-muted text-muted-foreground',
      )}
    >
      {complete && <Check className="h-3 w-3" aria-hidden="true" />}
      {label}: {filled}/{total}
    </span>
  );
}
