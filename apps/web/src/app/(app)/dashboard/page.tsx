'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Flag, Trophy, Users } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { PoolSummary } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingBlock } from '@/components/ui/loading';

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
    return { totalPools, totalMembers, totalEntries };
  }, [pools]);

  return (
    <div className="grid gap-5">
      <section className="rounded-3xl border border-white/20 bg-stadium p-5 shadow-card sm:p-6">
        <Badge variant="success" className="mb-3">Zona de juego</Badge>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">Hola, {user?.displayName}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Gestiona tus pools, publica tus predicciones y sigue el leaderboard en una experiencia moderna, clara y mobile first.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
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

      <section className="grid gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">Tus pools recientes</h2>

        {loading ? <LoadingBlock label="Cargando pools..." /> : null}
        {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}

        {!loading && !error && pools.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Aun no tienes pools. Unete con codigo para comenzar.
            </CardContent>
          </Card>
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
