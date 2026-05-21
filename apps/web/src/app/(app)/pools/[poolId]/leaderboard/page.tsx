'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { LeaderboardResponse } from '@/types/api';
import { PoolContextTabs } from '@/components/layout/pool-context-tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

export default function LeaderboardPage() {
  const params = useParams<{ poolId: string }>();
  const poolId = params.poolId;
  const { token, user } = useAuth();
  const isAdmin = user?.systemRole === 'ADMIN' || user?.systemRole === 'SUPER_ADMIN';
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin) {
      void router.replace('/polla/leaderboard');
    }
  }, [isAdmin, router]);

  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [entryId, setEntryId] = useState<string | undefined>(undefined);
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
        const [leaderboard, entries] = await Promise.all([
          api.getLeaderboard(poolId, token),
          api.listMyEntries(poolId, token),
        ]);
        setData(leaderboard);
        setEntryId(entries[0]?.id);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el ranking.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [poolId, token]);

  if (!isAdmin) {
    return <StatePanel variant="loading" description="Redirigiendo..." />;
  }

  if (loading) {
    return <StatePanel variant="loading" description="Cargando ranking..." />;
  }

  if (error) {
    return <StatePanel variant="error" description={error} />;
  }

  if (!data) {
    return <StatePanel variant="empty" description="No hay datos de ranking todavía." />;
  }

  return (
    <div className="grid gap-4">
      {isAdmin && <PoolContextTabs poolId={poolId} entryId={entryId} />}

      <header className="rounded-2xl border border-border/70 bg-surface p-4">
        <h1 className="text-2xl font-extrabold">Ranking</h1>
        <p className="text-sm text-muted-foreground">Ranking oficial de la polla.</p>
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
                <th className="pb-2">Participante</th>
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
                  <td className="py-2">
                    <Link
                      href={`/pools/${poolId}/entries/${row.entryId}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {row.entryName ?? row.entryId.slice(-6)}
                    </Link>
                  </td>
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
