'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { AdminPool, AdminTournament } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

export default function AdminHomePage() {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [pools, setPools] = useState<AdminPool[]>([]);
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
        const [tournamentsData, poolsData] = await Promise.all([
          api.adminListTournaments(token),
          api.adminListPools(token),
        ]);

        setTournaments(tournamentsData);
        setPools(poolsData);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar el resumen admin.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  const stats = useMemo(() => {
    const totalMatches = tournaments.reduce((acc, t) => acc + t._count.matches, 0);
    const totalPools = pools.length;
    return {
      totalTournaments: tournaments.length,
      totalMatches,
      totalPools,
    };
  }, [pools, tournaments]);

  if (loading) {
    return <StatePanel variant="loading" description="Cargando consola admin..." />;
  }

  if (error) {
    return <StatePanel variant="error" description={error} />;
  }

  return (
    <div className="grid gap-4">
      <header className="rounded-2xl border border-border/70 bg-surface p-4">
        <h1 className="text-2xl font-extrabold">Panel Admin</h1>
        <p className="text-sm text-muted-foreground">Consola operativa para gestionar torneos, matches y bonus questions.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard title="Torneos" value={stats.totalTournaments} />
        <MetricCard title="Matches" value={stats.totalMatches} />
        <MetricCard title="Pools" value={stats.totalPools} />
      </section>

      <section className="grid gap-3 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Torneos recientes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {tournaments.slice(0, 5).map((tournament) => (
              <Link
                key={tournament.id}
                href={`/admin/tournaments/${tournament.id}/matches`}
                className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 text-sm hover:border-primary/40"
              >
                <div>
                  <p className="font-semibold">{tournament.name}</p>
                  <p className="text-xs text-muted-foreground">{tournament._count.matches} matches</p>
                </div>
                <Badge variant="muted">{tournament.status}</Badge>
              </Link>
            ))}

            {tournaments.length === 0 && (
              <StatePanel variant="empty" description="No hay torneos creados todavia." compact />
            )}

            <Link href="/admin/tournaments" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
              Ver todos
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pools recientes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {pools.slice(0, 5).map((pool) => (
              <Link
                key={pool.id}
                href={`/admin/pools/${pool.id}/matches`}
                className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 text-sm hover:border-primary/40"
              >
                <div>
                  <p className="font-semibold">{pool.name}</p>
                  <p className="text-xs text-muted-foreground">{pool.tournament.name}</p>
                </div>
                <Badge>{pool.status}</Badge>
              </Link>
            ))}

            {pools.length === 0 && (
              <StatePanel variant="empty" description="No hay pools creados todavia." compact />
            )}

            <Link href="/admin/pools" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
              Ver todos
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({ title, value }: { title: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-5">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{title}</p>
        <p className="mt-2 text-3xl font-extrabold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}
