'use client';

import { useEffect, useState } from 'react';
import { ChevronRight, Medal, Trophy } from 'lucide-react';

import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { LatestMatchHighlightsResponse, LeaderboardResponse } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { StatePanel } from '@/components/ui/state-panel';
import { ParticipantBreakdownSheet } from '@/components/features/leaderboard/participant-breakdown-sheet';
import { LatestMatchCard } from '@/components/features/leaderboard/latest-match-card';

export default function PollaLeaderboardPage() {
  const { token, mainPool, mainPoolLoading, mainPoolError } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [highlights, setHighlights] = useState<LatestMatchHighlightsResponse>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<{ entryId: string; isOwner: boolean } | null>(null);

  useEffect(() => {
    if (!token || !mainPool) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [lb, hl] = await Promise.all([
          api.getLeaderboard(mainPool.pool.id, token),
          api.getLatestMatchHighlights(mainPool.pool.id, token).catch(() => null),
        ]);
        setLeaderboard(lb);
        setHighlights(hl);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el leaderboard');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token, mainPool]);

  if (mainPoolLoading || loading) {
    return <StatePanel variant="loading" description="Cargando ranking..." />;
  }

  if (mainPoolError ?? error) {
    return <StatePanel variant="error" description={mainPoolError ?? error!} />;
  }

  if (!leaderboard || !mainPool) {
    return <StatePanel variant="empty" description="No hay datos de ranking todavía." />;
  }

  const myEntryId = mainPool.entries[0]?.id;

  return (
    <>
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
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Ranking</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {mainPool.pool.tournament?.name ?? 'FIFA World Cup 2026'} · {leaderboard.leaderboard.length} participante{leaderboard.leaderboard.length !== 1 ? 's' : ''}
          </p>
        </header>

        {/* ── Último partido ───────────────────────────────────────────────── */}
        {highlights && <LatestMatchCard data={highlights} />}

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
                  isMe={isMe}
                  onClick={() => setSelectedEntry({ entryId: row.entryId, isOwner: isMe })}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ── Breakdown sheet ──────────────────────────────────────────────────── */}
      {selectedEntry && mainPool && token && (
        <ParticipantBreakdownSheet
          poolId={mainPool.pool.id}
          entryId={selectedEntry.entryId}
          isOwner={selectedEntry.isOwner}
          token={token}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </>
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
  isMe,
  onClick,
}: {
  rank: number;
  displayName: string;
  entryName?: string;
  totalPoints: number;
  matchPredictionsScored: number;
  questionPredictionsScored: number;
  isMe: boolean;
  onClick: () => void;
}) {
  const isTop1 = rank === 1;
  const isTop2 = rank === 2;
  const isTop3 = rank === 3;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver detalle de ${displayName}`}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left shadow-card-sm transition-all duration-150 active:scale-[0.99]',
        isTop1 && 'border-primary/30 bg-primary/8 hover:border-primary/50',
        isTop2 && 'border-slate-500/30 bg-slate-500/10 hover:border-slate-400/40',
        isTop3 && 'border-orange-400/30 bg-orange-500/10 hover:border-orange-400/40',
        !isTop1 && !isTop2 && !isTop3 && 'border-white/[0.08] bg-surface hover:border-primary/30 hover:shadow-card',
        isMe && !isTop1 && !isTop2 && !isTop3 && 'border-primary/40 bg-primary/10 shadow-glow-primary',
      )}
    >
      {/* Rank icon / number */}
      <RankDisplay rank={rank} />

      {/* Name + entry label */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn(
            'truncate text-sm font-semibold',
            isTop1 ? 'text-primary' : isTop2 ? 'text-slate-300' : isTop3 ? 'text-orange-300' : 'text-foreground',
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
        variant={isTop2 || isTop3 ? 'muted' : 'default'}
        className="shrink-0 tabular-nums"
      >
        {totalPoints} pts
      </Badge>

      {/* Drill-down affordance */}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
    </button>
  );
}

// ── RankDisplay ───────────────────────────────────────────────────────────────

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
        <Trophy className="h-5 w-5 text-primary" aria-label="1er lugar" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-500/20">
        <Medal className="h-5 w-5 text-slate-300" aria-label="2do lugar" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15">
        <Medal className="h-5 w-5 text-orange-400" aria-label="3er lugar" />
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">
      <span className="text-xs font-bold tabular-nums text-muted-foreground">#{rank}</span>
    </span>
  );
}
