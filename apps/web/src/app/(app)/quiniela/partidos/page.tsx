'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { PoolMatch, WorldCupMainPool } from '@/types/api';
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

function stageLabel(stage: string, groupCode?: string | null) {
  if (stage === 'GROUP') return groupCode ? `Grupo ${groupCode}` : 'Grupos';
  const map: Record<string, string> = {
    ROUND_OF_32: 'R32', ROUND_OF_16: 'R16', QUARTER_FINAL: 'QF',
    SEMI_FINAL: 'SF', THIRD_PLACE: '3er lugar', FINAL: 'Final',
  };
  return map[stage] ?? stage;
}

export default function PartidosPage() {
  const { token } = useAuth();
  const [mainPool, setMainPool] = useState<WorldCupMainPool | null>(null);
  const [matches, setMatches] = useState<PoolMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<MatchFilter>('upcoming');

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getMyMainPool(token);
        setMainPool(data);
        const matchData = await api.listPoolMatches(data.pool.id, token);
        setMatches(matchData.matches);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los partidos');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  const filtered = useMemo(() => {
    switch (filter) {
      case 'upcoming':
        return matches
          .filter((m) => m.status === 'SCHEDULED')
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

  if (loading) {
    return <StatePanel variant="loading" description="Cargando partidos..." />;
  }

  if (error) {
    return <StatePanel variant="error" description={error} />;
  }

  if (!mainPool) return null;

  const entryId = mainPool.mainEntry.id;
  const poolId = mainPool.pool.id;

  return (
    <div className="grid gap-4 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="rounded-2xl border border-border/70 bg-surface/90 p-4 shadow-card-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Partidos</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {mainPool.pool.tournament?.name ?? 'FIFA World Cup 2026'} · {matches.length} partidos en total
        </p>
      </header>

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Filtrar partidos"
        className="scrollbar-sport flex gap-1.5 overflow-x-auto rounded-2xl border border-border/70 bg-surface/90 p-1.5 shadow-card-sm"
      >
        {(Object.keys(FILTER_LABELS) as MatchFilter[]).map((key) => {
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
}: {
  match: PoolMatch;
  poolId: string;
  entryId: string;
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

  const kickoff = new Date(match.kickoffAt);
  const timeStr = kickoff.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  const dateStr = kickoff.toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' });

  const stageBadge = stageLabel(match.stage, match.group?.code);
  const statusBadgeVariant = isLive ? 'live' : isFinished ? 'muted' : 'default';
  const statusLabel = isLive ? 'LIVE' : isFinished ? 'Final' : 'Próximo';

  return (
    <div className="rounded-xl border border-border/60 bg-surface/90 px-4 py-3.5 shadow-card-sm transition-all duration-150 hover:border-primary/20 hover:shadow-card">

      {/* ── Top row: stage + status badge ── */}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
          {stageBadge}
        </span>
        <Badge variant={statusBadgeVariant}>{statusLabel}</Badge>
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

        {/* Center: score or vs + time */}
        <div className="flex flex-col items-center gap-0.5 px-3">
          {isFinished || isLive ? (
            <span className={cn(
              'rounded-lg px-3 py-1 text-sm font-extrabold tabular-nums leading-none',
              isLive ? 'bg-rose-500/10 text-rose-600' : 'bg-muted text-foreground',
            )}>
              {match.homeScore ?? 0} – {match.awayScore ?? 0}
            </span>
          ) : (
            <>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                vs
              </span>
              <span className="text-xs font-semibold tabular-nums text-foreground">{timeStr}</span>
            </>
          )}
          <span className="text-[10px] text-muted-foreground">{dateStr}</span>
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
        <div className="mt-3 flex justify-end">
          <Link href={`/pools/${poolId}/entries/${entryId}`}>
            <Button size="sm" className="gap-1.5">
              Predecir
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
