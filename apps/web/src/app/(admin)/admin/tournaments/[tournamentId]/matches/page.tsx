'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, HelpCircle } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { AdminMatch } from '@/types/api';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
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
      const data = await api.adminListTournamentMatches(tournamentId, token);
      setTournamentName(data.tournament.name);
      setMatches(data.matches);
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

    const queryTokens = search.trim().toLowerCase().split(/\s+/).filter(Boolean);

    return sorted.filter((match) => {
      if (groupFilter !== 'ALL') {
        if (groupFilter === groupLabels.NO_GROUP) {
          if (match.group?.code) return false;
        } else if (match.group?.code !== groupFilter) {
          return false;
        }
      }

      if (queryTokens.length === 0) return true;

      const tokens = [
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
        .join(' ')
        .toLowerCase();

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

  if (loading) {
    return <StatePanel variant="loading" description="Cargando matches del torneo..." />;
  }

  if (error && matches.length === 0) {
    return <StatePanel variant="error" description={error} />;
  }

  return (
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
        <div className="grid gap-3 rounded-2xl border border-border/70 bg-gradient-to-br from-white via-white to-emerald-50/70 p-4">
          <div className="grid gap-3 lg:grid-cols-[2fr_1fr] lg:items-end">
            <div className="grid gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Buscar
              </p>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ej: MEX, Grupo A, Matchday 1, #12"
              />
            </div>
            <div className="grid gap-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Grupo / Fase
              </p>
              <select
                className="h-11 w-full rounded-md border border-input bg-white/90 px-3 text-sm text-foreground shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
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

          return (
            <article
              key={match.id}
              className={`grid gap-3 rounded-xl border p-4 shadow-sm transition-colors ${
                isFinished ? 'border-emerald-200/70 bg-emerald-50/30' : 'border-border/70 bg-white'
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
                <time className="text-xs text-muted-foreground" dateTime={match.kickoffAt}>
                  {formatDateTime(match.kickoffAt)}
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
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">Resultado oficial:</span>
                  <span className="font-bold tabular-nums text-emerald-800">
                    {match.homeScore} – {match.awayScore}
                  </span>
                  <span className="ml-auto text-[10px] text-emerald-600/70">
                    Editable si necesitas corregir
                  </span>
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
                    className="h-10 text-center text-base font-bold"
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
                    className="h-10 text-center text-base font-bold"
                  />
                </div>
              </div>

              {/* Row 5: actions */}
              <div className="flex flex-wrap items-center justify-between gap-2">
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

                <div className="flex flex-wrap items-center gap-2">
                  {justSaved && (
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Guardado
                    </span>
                  )}
                  <ConfirmActionButton
                    size="sm"
                    disabled={savingId === match.id}
                    label={savingId === match.id ? 'Guardando...' : isFinished ? 'Actualizar resultado' : 'Guardar y cerrar'}
                    confirmLabel="Sí, confirmar"
                    title="Confirmar resultado"
                    description={`Se guardará ${drafts[match.id]?.homeScore || '-'} – ${drafts[match.id]?.awayScore || '-'} y el partido quedará como Finalizado.`}
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
  );
}
