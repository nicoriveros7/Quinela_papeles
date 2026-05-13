'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { formatDateTime, matchStatusLabel } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { PoolMatch, WorldCupMainPool } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatePanel } from '@/components/ui/state-panel';

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
    <div className="grid gap-4">
      <header className="rounded-2xl border border-border/70 bg-surface p-4">
        <h1 className="text-2xl font-extrabold">Partidos</h1>
        <p className="text-sm text-muted-foreground">
          {mainPool.pool.tournament?.name ?? 'FIFA World Cup 2026'} · {matches.length} partidos en total
        </p>
      </header>

      {/* Filtros */}
      <div className="overflow-x-auto rounded-2xl border border-border/70 bg-surface/90 p-2">
        <nav className="flex min-w-max gap-2">
          {(Object.keys(FILTER_LABELS) as MatchFilter[]).map((key) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition ${
                filter === key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary'
              }`}
            >
              {FILTER_LABELS[key]}
            </button>
          ))}
        </nav>
      </div>

      {/* Lista de partidos */}
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
  const homeLabel = home?.name ?? match.homeSlotLabel ?? 'TBD';
  const awayLabel = away?.name ?? match.awaySlotLabel ?? 'TBD';
  const homeCode = home?.code ?? match.homeSlotLabel ?? 'TBD';
  const awayCode = away?.code ?? match.awaySlotLabel ?? 'TBD';
  const isScheduled = match.status === 'SCHEDULED';
  const isFinished = match.status === 'FINISHED';

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-surface/90 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span title={homeLabel}>{homeCode}</span>
          {isFinished ? (
            <span className="rounded bg-muted px-2 py-0.5 text-xs font-bold">
              {match.homeScore ?? 0} – {match.awayScore ?? 0}
            </span>
          ) : (
            <span className="text-muted-foreground">vs</span>
          )}
          <span title={awayLabel}>{awayCode}</span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{homeLabel} vs {awayLabel}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{stageLabel(match.stage, match.group?.code)}</span>
          <span>·</span>
          <span>{formatDateTime(match.kickoffAt)}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge
          variant={
            match.status === 'LIVE'
              ? 'success'
              : match.status === 'FINISHED'
              ? 'muted'
              : 'default'
          }
        >
          {matchStatusLabel(match.status)}
        </Badge>

        {isScheduled ? (
          <Link href={`/pools/${poolId}/entries/${entryId}`}>
            <Button size="sm" variant="outline">
              Predecir
            </Button>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
