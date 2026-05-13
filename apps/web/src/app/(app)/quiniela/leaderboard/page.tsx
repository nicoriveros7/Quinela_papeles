'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Medal, Trophy } from 'lucide-react';

import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { LeaderboardResponse, WorldCupMainPool } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { StatePanel } from '@/components/ui/state-panel';

export default function QuinielaLeaderboardPage() {
  const { token } = useAuth();
  const [mainPool, setMainPool] = useState<WorldCupMainPool | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getMyMainPool(token);
        setMainPool(data);
        const lb = await api.getLeaderboard(data.pool.id, token);
        setLeaderboard(lb);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el leaderboard');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  if (loading) {
    return <StatePanel variant="loading" description="Cargando leaderboard..." />;
  }

  if (error) {
    return <StatePanel variant="error" description={error} />;
  }

  if (!leaderboard || !mainPool) {
    return <StatePanel variant="empty" description="No hay datos de leaderboard todavía." />;
  }

  const myEntryId = mainPool.entries[0]?.id;
  const poolId = mainPool.pool.id;

  return (
    <div className="grid gap-4 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="rounded-2xl border border-border/70 bg-surface/90 p-4 shadow-card-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Leaderboard</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {mainPool.pool.tournament?.name ?? 'FIFA World Cup 2026'} · {leaderboard.leaderboard.length} participantes
        </p>
      </header>

      {/* ── Ranking ─────────────────────────────────────────────────────────── */}
      {leaderboard.leaderboard.length === 0 ? (
        <StatePanel
          variant="empty"
          description="Aún no hay predicciones registradas. ¡Sé el primero en predecir!"
        />
      ) : (
        <div className="grid gap-2">
          {leaderboard.leaderboard.map((row) => {
            const isMe = row.entryId === myEntryId;
            return (
              <LeaderboardRow
                key={row.entryId}
                rank={row.rank}
                displayName={row.userDisplayName}
                entryName={row.entryName ?? undefined}
                totalPoints={row.totalPoints}
                matchPredictionsScored={row.matchPredictionsScored}
                questionPredictionsScored={row.questionPredictionsScored}
                entryId={row.entryId}
                poolId={poolId}
                isMe={isMe}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── LeaderboardRow ────────────────────────────────────────────────────────────

function LeaderboardRow({
  rank,
  displayName,
  entryName,
  totalPoints,
  matchPredictionsScored,
  questionPredictionsScored,
  entryId,
  poolId,
  isMe,
}: {
  rank: number;
  displayName: string;
  entryName?: string;
  totalPoints: number;
  matchPredictionsScored: number;
  questionPredictionsScored: number;
  entryId: string;
  poolId: string;
  isMe: boolean;
}) {
  const isTop1 = rank === 1;
  const isTop2 = rank === 2;
  const isTop3 = rank === 3;

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl border px-4 py-3.5 shadow-card-sm transition-all duration-150',
        isTop1 && 'border-amber-300/50 bg-amber-50/60',
        isTop2 && 'border-slate-300/50 bg-slate-50/50',
        isTop3 && 'border-orange-300/40 bg-orange-50/40',
        !isTop1 && !isTop2 && !isTop3 && 'border-border/60 bg-surface/90 hover:border-primary/20 hover:shadow-card',
        isMe && !isTop1 && !isTop2 && !isTop3 && 'border-primary/30 bg-primary/5',
      )}
    >
      {/* Rank icon / number */}
      <RankDisplay rank={rank} />

      {/* Name + entry label */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'truncate text-sm font-semibold',
            isTop1 ? 'text-amber-800' : isTop2 ? 'text-slate-700' : isTop3 ? 'text-orange-800' : 'text-foreground',
          )}>
            {displayName}
          </span>
          {isMe && (
            <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              Tú
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          {entryName ? <span className="truncate">{entryName}</span> : null}
          <span className="tabular-nums">{matchPredictionsScored} partidos · {questionPredictionsScored} bonus</span>
        </div>
      </div>

      {/* Points badge */}
      <Badge
        variant={isTop1 ? 'warning' : isTop2 || isTop3 ? 'muted' : 'default'}
        className="shrink-0 tabular-nums"
      >
        {totalPoints} pts
      </Badge>

      {/* Link to entry — visible on sm+ */}
      <Link
        href={`/pools/${poolId}/entries/${entryId}`}
        aria-label={`Ver boleta de ${displayName}`}
        className="hidden shrink-0 text-muted-foreground transition-colors hover:text-primary sm:block"
      >
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

// ── RankDisplay ───────────────────────────────────────────────────────────────

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400/20">
        <Trophy className="h-5 w-5 text-amber-500" aria-label="1er lugar" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200/60">
        <Medal className="h-5 w-5 text-slate-500" aria-label="2do lugar" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-200/50">
        <Medal className="h-5 w-5 text-orange-500" aria-label="3er lugar" />
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
      <span className="text-xs font-bold tabular-nums text-muted-foreground">#{rank}</span>
    </span>
  );
}
