'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { LeaderboardResponse, WorldCupMainPool } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    return <StatePanel variant="empty" description="No hay datos de leaderboard todavia." />;
  }

  const myEntryId = mainPool.entries[0]?.id;
  const poolId = mainPool.pool.id;

  return (
    <div className="grid gap-4">
      <header className="rounded-2xl border border-border/70 bg-surface p-4">
        <h1 className="text-2xl font-extrabold">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">
          {mainPool.pool.tournament?.name ?? 'FIFA World Cup 2026'} · {leaderboard.leaderboard.length} participantes
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Clasificación general</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {leaderboard.leaderboard.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay predicciones registradas. ¡Sé el primero en predecir!
            </p>
          ) : (
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                  <th className="pb-2 pr-4">Rank</th>
                  <th className="pb-2 pr-4">Jugador</th>
                  <th className="pb-2 pr-4">Boleta</th>
                  <th className="pb-2 pr-4">Total</th>
                  <th className="pb-2 pr-4">Partidos</th>
                  <th className="pb-2">Bonus</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.leaderboard.map((row) => {
                  const isMe = row.entryId === myEntryId;
                  return (
                    <tr
                      key={row.entryId}
                      className={`border-t border-border/70 ${isMe ? 'bg-primary/5' : ''}`}
                    >
                      <td className="py-2 pr-4 font-bold">
                        #{row.rank}
                      </td>
                      <td className="py-2 pr-4">
                        {row.userDisplayName}
                        {isMe ? (
                          <span className="ml-1.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            Tú
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4">
                        <Link
                          href={`/pools/${poolId}/entries/${row.entryId}`}
                          className="font-semibold text-primary hover:underline"
                        >
                          {row.entryName ?? row.entryId.slice(-6)}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="success">{row.totalPoints} pts</Badge>
                      </td>
                      <td className="py-2 pr-4">{row.matchPredictionsScored}</td>
                      <td className="py-2">{row.questionPredictionsScored}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
