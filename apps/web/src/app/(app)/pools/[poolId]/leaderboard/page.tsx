'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { LeaderboardResponse } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingBlock } from '@/components/ui/loading';

export default function LeaderboardPage() {
  const params = useParams<{ poolId: string }>();
  const poolId = params.poolId;
  const { token } = useAuth();

  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const leaderboard = await api.getLeaderboard(poolId, token);
        setData(leaderboard);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el leaderboard.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [poolId, token]);

  if (loading) {
    return <LoadingBlock label="Cargando leaderboard..." />;
  }

  if (error) {
    return <p className="text-sm font-semibold text-rose-600">{error}</p>;
  }

  if (!data) {
    return null;
  }

  return (
    <div className="grid gap-4">
      <header className="rounded-2xl border border-border/70 bg-surface p-4">
        <h1 className="text-2xl font-extrabold">Leaderboard</h1>
        <p className="text-sm text-muted-foreground">Ranking oficial de esta pool.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Posiciones</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
                <th className="pb-2">Rank</th>
                <th className="pb-2">Entry</th>
                <th className="pb-2">Jugador</th>
                <th className="pb-2">Total</th>
                <th className="pb-2">Match</th>
                <th className="pb-2">Bonus</th>
              </tr>
            </thead>
            <tbody>
              {data.leaderboard.map((row) => (
                <tr key={row.entryId} className="border-t border-border/70">
                  <td className="py-2 font-bold">#{row.rank}</td>
                  <td className="py-2">{row.entryName ?? row.entryId.slice(-6)}</td>
                  <td className="py-2">{row.userDisplayName}</td>
                  <td className="py-2">
                    <Badge variant="success">{row.totalPoints} pts</Badge>
                  </td>
                  <td className="py-2">{row.matchPredictionsScored}</td>
                  <td className="py-2">{row.questionPredictionsScored}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
