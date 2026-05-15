'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, RotateCcw } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { AdminMatch } from '@/types/api';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { StatePanel } from '@/components/ui/state-panel';
import { TeamLabel } from '@/components/ui/team-label';

const STATUS_LABELS: Record<AdminMatch['status'], string> = {
  SCHEDULED: 'Programado',
  LIVE: 'En juego',
  FINISHED: 'Finalizado',
  POSTPONED: 'Postergado',
  CANCELLED: 'Cancelado',
};

function getStatusVariant(status: AdminMatch['status']): BadgeVariant {
  if (status === 'FINISHED') return 'success';
  if (status === 'LIVE') return 'live';
  if (status === 'CANCELLED') return 'danger';
  if (status === 'POSTPONED') return 'warning';
  return 'muted';
}

function getSideLabel(match: AdminMatch, side: 'home' | 'away') {
  if (side === 'home') {
    return match.homeTournamentTeam?.team.name ?? match.homeSlotLabel ?? 'TBD';
  }
  return match.awayTournamentTeam?.team.name ?? match.awaySlotLabel ?? 'TBD';
}

function getTeamProps(team: AdminMatch['homeTournamentTeam']) {
  if (!team) return null;
  return { name: team.team.name, code: team.team.code, flagEmoji: team.team.flagEmoji };
}

export default function PoolMatchesPage() {
  const params = useParams<{ poolId: string }>();
  const poolId = params?.poolId ?? '';
  const { token } = useAuth();
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [poolName, setPoolName] = useState('Pool');
  const [tournamentName, setTournamentName] = useState('Torneo');
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => `${poolName} · ${tournamentName}`, [poolName, tournamentName]);

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.adminListPoolMatches(poolId, token);
        setMatches(data.matches);
        setPoolName(data.pool.name);
        setTournamentName(data.tournament.name);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar los matches del pool.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [poolId, token]);

  const recalculate = async () => {
    if (!token) return;
    setRecalculating(true);
    setError(null);
    setMessage(null);
    try {
      await api.adminRecalculatePoolScoring(poolId, token);
      setMessage('Scoring recalculado correctamente.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo recalcular scoring.');
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return <StatePanel variant="loading" description="Cargando matches del pool..." />;
  }

  if (error && matches.length === 0) {
    return <StatePanel variant="error" description={error} />;
  }

  const finishedCount = matches.filter((m) => m.status === 'FINISHED').length;

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/admin/pools"
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a pools
          </Link>
          <div className="inline-flex items-center gap-2">
            {!recalculating && <RotateCcw className="h-4 w-4 text-muted-foreground" />}
            <ConfirmActionButton
              size="sm"
              variant="outline"
              label={recalculating ? 'Recalculando...' : 'Recalcular scoring'}
              confirmLabel="Sí, recalcular ahora"
              title="Confirmar recálculo de scoring"
              description={`Esta acción recalcula todos los puntajes del pool con los ${finishedCount} partidos finalizados actuales.`}
              disabled={recalculating}
              onConfirm={recalculate}
              panelClassName="w-full sm:max-w-[340px]"
            />
          </div>
        </div>

        <div>
          <CardTitle>{title}</CardTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {finishedCount} de {matches.length} partidos finalizados
          </p>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3">
        {error && (
          <div role="alert" aria-live="assertive">
            <StatePanel variant="error" description={error} compact />
          </div>
        )}
        {message && (
          <div role="status" aria-live="polite">
            <StatePanel variant="success" description={message} compact />
          </div>
        )}
        {matches.length === 0 && (
          <StatePanel variant="empty" description="No hay matches disponibles en este pool." />
        )}

        {matches.map((match) => {
          const isFinished = match.status === 'FINISHED';
          const hasScore = match.homeScore !== null && match.awayScore !== null;
          const homeTeam = getTeamProps(match.homeTournamentTeam);
          const awayTeam = getTeamProps(match.awayTournamentTeam);

          return (
            <article
              key={match.id}
              className={`grid gap-2 rounded-xl border p-3 text-sm transition-colors ${
                isFinished ? 'border-emerald-200/60 bg-emerald-50/20' : 'border-border/70 bg-white'
              }`}
            >
              {/* Top row: status + date */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant={getStatusVariant(match.status)} className="text-[11px]">
                  {STATUS_LABELS[match.status]}
                </Badge>
                <time className="text-xs text-muted-foreground" dateTime={match.kickoffAt}>
                  {formatDateTime(match.kickoffAt)}
                </time>
              </div>

              {/* Teams + score */}
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  {homeTeam ? (
                    <TeamLabel
                      name={homeTeam.name}
                      code={homeTeam.code}
                      flagEmoji={homeTeam.flagEmoji}
                      format="compact"
                      className="text-sm font-semibold text-foreground"
                    />
                  ) : (
                    <span className="font-semibold text-muted-foreground">
                      {getSideLabel(match, 'home')}
                    </span>
                  )}
                </div>

                <span className="shrink-0 font-bold tabular-nums text-foreground">
                  {hasScore ? (
                    <>
                      <span className={isFinished ? 'text-emerald-700' : ''}>
                        {match.homeScore}
                      </span>
                      <span className="mx-1 text-muted-foreground">–</span>
                      <span className={isFinished ? 'text-emerald-700' : ''}>
                        {match.awayScore}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin resultado</span>
                  )}
                </span>

                <div className="min-w-0 flex-1 text-right">
                  {awayTeam ? (
                    <TeamLabel
                      name={awayTeam.name}
                      code={awayTeam.code}
                      flagEmoji={awayTeam.flagEmoji}
                      format="compact"
                      className="text-sm font-semibold text-foreground"
                    />
                  ) : (
                    <span className="font-semibold text-muted-foreground">
                      {getSideLabel(match, 'away')}
                    </span>
                  )}
                </div>
              </div>

              {/* Bonus questions link + predictions count */}
              <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
                <Link
                  href={`/admin/matches/${match.id}/questions`}
                  className="font-semibold text-primary hover:underline"
                >
                  Preguntas bonus
                  {match._count.questions > 0 && ` (${match._count.questions})`}
                </Link>
                {match._count.predictions > 0 && (
                  <span>{match._count.predictions} predicciones</span>
                )}
              </div>
            </article>
          );
        })}
      </CardContent>
    </Card>
  );
}
