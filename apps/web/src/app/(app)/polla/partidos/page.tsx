'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Lock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { formatMatchKickoff, matchProximityLabel } from '@/lib/format';
import { SHOW_KNOCKOUT } from '@/lib/feature-flags';
import { useAuth } from '@/providers/auth-provider';
import { PoolMatchListItem } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';
import { TeamLabel } from '@/components/ui/team-label';

type MatchFilter = 'upcoming' | 'group' | 'knockout' | 'finished';

const KNOCKOUT_STAGES = new Set([
  'ROUND_OF_32', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'THIRD_PLACE', 'FINAL',
]);

const FILTER_LABELS: Record<MatchFilter, string> = {
  upcoming: 'Próximos',
  group: 'Grupos',
  knockout: 'Eliminatorias',
  finished: 'Finalizados',
};

function isMatchLocked(kickoffAt: string, lockMinutes: number): boolean {
  const lockAt = new Date(new Date(kickoffAt).getTime() - lockMinutes * 60_000);
  return Date.now() >= lockAt.getTime();
}

function stageLabel(stage: string, groupCode?: string | null) {
  if (stage === 'GROUP') return groupCode ? `Grupo ${groupCode}` : 'Grupos';
  const map: Record<string, string> = {
    ROUND_OF_32: 'R32', ROUND_OF_16: 'R16', QUARTER_FINAL: 'QF',
    SEMI_FINAL: 'SF', THIRD_PLACE: '3er lugar', FINAL: 'Final',
  };
  return map[stage] ?? stage;
}

function jornadaLabel(match: PoolMatchListItem): string | null {
  if (match.stage === 'GROUP') {
    if (match.roundLabel === 'Matchday 1') return 'Jornada 1';
    if (match.roundLabel === 'Matchday 2') return 'Jornada 2';
    if (match.roundLabel === 'Matchday 3') return 'Jornada 3';
    return null;
  }
  return null; // knockout stage shown via stageLabel already
}

export default function PartidosPage() {
  const { token, mainPool, mainPoolLoading, mainPoolError } = useAuth();
  const [matches, setMatches] = useState<PoolMatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MatchFilter>('upcoming');

  useEffect(() => {
    if (!token || !mainPool) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const matchData = await api.listPoolMatchesLite(mainPool.pool.id, token);
        setMatches(matchData.matches);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los partidos');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token, mainPool]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'upcoming':
        return matches
          .filter((m) => m.status === 'SCHEDULED' && new Date(m.kickoffAt) > new Date() && (SHOW_KNOCKOUT || m.stage === 'GROUP'))
          .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
      case 'group':
        return matches
          .filter((m) => m.stage === 'GROUP')
          .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
      case 'knockout':
        return matches
          .filter((m) => KNOCKOUT_STAGES.has(m.stage))
          .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());
      case 'finished':
        return matches
          .filter((m) => m.status === 'FINISHED')
          .sort((a, b) => new Date(b.kickoffAt).getTime() - new Date(a.kickoffAt).getTime());
    }
  }, [matches, filter]);

  if (mainPoolLoading || loading) {
    return <StatePanel variant="loading" description="Cargando partidos..." />;
  }

  if (mainPoolError ?? error) {
    return <StatePanel variant="error" description={mainPoolError ?? error!} />;
  }

  if (!mainPool) return null;

  const entryId = mainPool.mainEntry.id;
  const poolId = mainPool.pool.id;

  return (
    <div className="grid gap-4 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-surface p-4 shadow-card-sm shadow-inner-subtle">
        {/* Subtle premium glow */}
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 -z-10 h-full w-full opacity-40 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at top right, hsl(var(--primary) / 0.08), transparent 45%)',
          }}
        />
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Partidos</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {mainPool.pool.tournament?.name ?? 'FIFA World Cup 2026'} · {matches.length} partidos en total
        </p>
      </header>

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Filtrar partidos"
        className="scrollbar-sport min-w-0 flex gap-1.5 overflow-x-auto rounded-2xl border border-border/70 bg-surface/90 p-1.5 shadow-card-sm [-webkit-overflow-scrolling:touch]"
      >
        {(Object.keys(FILTER_LABELS) as MatchFilter[]).filter((key) => SHOW_KNOCKOUT || key !== 'knockout').map((key) => {
          const active = filter === key;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(key)}
              className={cn(
                'shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.08em]',
                'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                active
                  ? 'bg-primary text-primary-foreground shadow-card-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {FILTER_LABELS[key]}
            </button>
          );
        })}
      </div>

      {/* ── Lista de partidos ────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <StatePanel variant="empty" description="No hay partidos en esta categoría." compact />
      ) : (
        <div className="grid gap-2">
          {filtered.map((match) => (
            <MatchRow
              key={match.id}
              match={match}
              poolId={poolId}
              entryId={entryId}
              lockMinutes={mainPool.pool.lockMinutesBeforeKickoff}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── MatchRow ──────────────────────────────────────────────────────────────────

function MatchRow({
  match,
  poolId,
  entryId,
  lockMinutes,
}: {
  match: PoolMatchListItem;
  poolId: string;
  entryId: string;
  lockMinutes: number;
}) {
  const home = match.homeTournamentTeam?.team;
  const away = match.awayTournamentTeam?.team;
  const homeCode = home?.code ?? match.homeSlotLabel ?? 'TBD';
  const awayCode = away?.code ?? match.awaySlotLabel ?? 'TBD';
  const homeName = home?.name ?? match.homeSlotLabel ?? 'Por definir';
  const awayName = away?.name ?? match.awaySlotLabel ?? 'Por definir';

  const isLive = match.status === 'LIVE';
  const isFinished = match.status === 'FINISHED';
  const isScheduled = match.status === 'SCHEDULED';

  const stageBadge = stageLabel(match.stage, match.group?.code);
  const statusBadgeVariant = isLive ? 'live' : isFinished ? 'muted' : 'default';
  const statusBadgeLabel = isLive ? 'LIVE' : isFinished ? 'Final' : 'Próximo';
  const proximity = isScheduled ? matchProximityLabel(match.kickoffAt) : null;
  const jornada = jornadaLabel(match);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-surface px-4 py-3.5 shadow-card-sm shadow-inner-subtle transition-all duration-150 hover:border-primary/25 hover:shadow-card">

      {/* ── Top row: date (prominent) + stage/status ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {/* Date — primary info */}
        <div className="flex items-center gap-1.5 min-w-0">
          <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden="true" />
          <time
            dateTime={match.kickoffAt}
            className="text-sm font-semibold text-foreground"
          >
            {formatMatchKickoff(match.kickoffAt)}
          </time>
          {proximity && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold text-primary">
              {proximity}
            </span>
          )}
        </div>
        {/* Stage + jornada + status — secondary */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
            {stageBadge}
          </span>
          {jornada && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {jornada}
            </span>
          )}
          <Badge variant={statusBadgeVariant}>{statusBadgeLabel}</Badge>
        </div>
      </div>

      {/* ── Match: home | center | away ── */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">

        {/* Home */}
        <div className="flex flex-col items-end">
          <TeamLabel
            name={homeName}
            code={homeCode}
            flagEmoji={home?.flagEmoji}
            format="compact"
            className="text-base font-extrabold leading-none text-foreground"
          />
          <span className="mt-0.5 max-w-[100px] truncate text-[11px] text-muted-foreground text-right">
            {home?.name ?? ''}
          </span>
        </div>

        {/* Center: score or vs */}
        <div className="flex flex-col items-center gap-0.5 px-3">
          {isFinished || isLive ? (
            <span className={cn(
              'rounded-lg px-3 py-1 text-sm font-extrabold tabular-nums leading-none',
              isLive ? 'bg-rose-500/10 text-rose-400' : 'bg-muted text-foreground',
            )}>
              {match.homeScore ?? 0} – {match.awayScore ?? 0}
            </span>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              vs
            </span>
          )}
        </div>

        {/* Away */}
        <div className="flex flex-col items-start">
          <TeamLabel
            name={awayName}
            code={awayCode}
            flagEmoji={away?.flagEmoji}
            format="compact"
            className="text-base font-extrabold leading-none text-foreground"
          />
          <span className="mt-0.5 max-w-[100px] truncate text-[11px] text-muted-foreground">
            {away?.name ?? ''}
          </span>
        </div>
      </div>

      {/* ── Bottom: Predecir CTA (scheduled only) ── */}
      {isScheduled ? (
        isMatchLocked(match.kickoffAt, lockMinutes) ? (
          <div className="mt-3 flex justify-end">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Predicciones cerradas
            </span>
          </div>
        ) : (
          <div className="mt-3 flex justify-end">
            <Link href={`/pools/${poolId}/entries/${entryId}?matchId=${match.id}`}>
              <Button size="sm" className="gap-1.5">
                Predecir
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        )
      ) : null}
    </div>
  );
}
