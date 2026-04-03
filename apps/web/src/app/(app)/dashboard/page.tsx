'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Flag, Goal, Shield, Trophy, Users } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { PoolSummary } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

export default function DashboardPage() {
  const { token, user } = useAuth();
  const [pools, setPools] = useState<PoolSummary[]>([]);
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
        const data = await api.listPools(token);
        setPools(data);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar tus pools');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  const stats = useMemo(() => {
    const totalPools = pools.length;
    const totalMembers = pools.reduce((acc, pool) => acc + (pool._count?.members ?? 0), 0);
    const totalEntries = pools.reduce((acc, pool) => acc + (pool._count?.entries ?? 0), 0);
    const averageEntriesPerPool = totalPools > 0 ? (totalEntries / totalPools).toFixed(1) : '0.0';
    const poolsWithJoinCode = pools.filter((pool) => Boolean(pool.joinCode)).length;
    return { totalPools, totalMembers, totalEntries, averageEntriesPerPool, poolsWithJoinCode };
  }, [pools]);

  const topPools = useMemo(
    () => [...pools].sort((a, b) => (b._count?.entries ?? 0) - (a._count?.entries ?? 0)).slice(0, 3),
    [pools],
  );

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-white/20 bg-stadium p-5 shadow-card sm:p-6">
        <Badge variant="success" className="mb-3">Zona de juego</Badge>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Hola, {user?.displayName}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Gestiona tus pools, publica tus predicciones y sigue el leaderboard en una experiencia moderna, clara y mobile first.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
          <Shield className="h-3.5 w-3.5" />
          Temporada activa en progreso
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pools activas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-extrabold">{stats.totalPools}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Participantes</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-extrabold">{stats.totalMembers}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Entries</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-extrabold">{stats.totalEntries}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Entries por pool</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-extrabold">{stats.averageEntriesPerPool}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pools con join code</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-2xl font-extrabold">{stats.poolsWithJoinCode}</CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <QuickLink
          href="/pools"
          icon={Users}
          title="Explorar pools"
          description="Mira tus ligas y entra al detalle de cada una."
        />
        <QuickLink
          href="/pools/join"
          icon={Flag}
          title="Unirme con codigo"
          description="Ingresa un join code y entra a competir al instante."
        />
        <QuickLink
          href="/pools"
          icon={Trophy}
          title="Ver leaderboard"
          description="Sigue posiciones, puntaje total y rendimiento."
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <div className="grid gap-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">Tus pools recientes</h2>

          {loading ? <StatePanel variant="loading" description="Estamos preparando tus pools..." /> : null}
          {error ? <StatePanel variant="error" description={error} /> : null}

          {!loading && !error && pools.length === 0 ? (
            <StatePanel variant="empty" description="Aun no tienes pools. Unete con codigo para comenzar." />
          ) : null}

          {!loading && !error
            ? pools.slice(0, 4).map((pool) => (
                <Card key={pool.id}>
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div>
                      <p className="font-semibold text-foreground">{pool.name}</p>
                      <p className="text-xs text-muted-foreground">{pool.tournament?.name ?? 'Torneo'}</p>
                    </div>
                    <Link href={`/pools/${pool.id}`} className="inline-flex">
                      <Button variant="outline" size="sm">
                        Abrir
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))
            : null}
        </div>

        <div className="grid gap-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">Resumen de actividad</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pools mas activas</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {topPools.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin actividad todavia.</p>
              ) : (
                topPools.map((pool) => (
                  <Link
                    key={pool.id}
                    href={`/pools/${pool.id}`}
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-white/70 px-3 py-2 text-sm hover:border-primary/40"
                  >
                    <span className="font-semibold">{pool.name}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Goal className="h-3.5 w-3.5" />
                      {pool._count?.entries ?? 0} entries
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <Link href={href} className="group rounded-2xl border border-border/70 bg-surface/90 p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40">
      <div className="mb-2 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
        Ir ahora
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}
