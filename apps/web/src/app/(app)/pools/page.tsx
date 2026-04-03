'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Plus, Trophy, Users } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { PoolSummary } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

export default function PoolsPage() {
  const { token } = useAuth();
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
        const result = await api.listPools(token);
        setPools(result);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar los pools');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  return (
    <div className="grid gap-4">
      <header className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-surface p-4">
        <div>
          <h1 className="text-xl font-extrabold">Mis Pools</h1>
          <p className="text-sm text-muted-foreground">Administra tus pools, entries y predicciones.</p>
        </div>
        <Link href="/pools/join" className="inline-flex">
          <Button variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Unirme
          </Button>
        </Link>
      </header>

      {loading ? <StatePanel variant="loading" description="Cargando pools..." /> : null}
      {error ? <StatePanel variant="error" description={error} /> : null}

      {!loading && !error && pools.length === 0 ? (
        <StatePanel variant="empty" description="No hay pools disponibles para tu usuario." />
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
        {pools.map((pool) => (
          <Card key={pool.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-2">
                <span>{pool.name}</span>
                <Badge>{pool.status}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <p className="text-sm text-muted-foreground">{pool.tournament?.name ?? 'Torneo'}</p>

              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {pool._count?.members ?? 0} miembros
                </span>
                <span className="inline-flex items-center gap-1">
                  <Trophy className="h-3.5 w-3.5" />
                  {pool._count?.entries ?? 0} entries
                </span>
              </div>

              <div className="flex gap-2">
                <Link href={`/pools/${pool.id}`} className="inline-flex">
                  <Button size="sm">Entrar</Button>
                </Link>
                <Link href={`/pools/${pool.id}/leaderboard`} className="inline-flex">
                  <Button size="sm" variant="outline">Leaderboard</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
