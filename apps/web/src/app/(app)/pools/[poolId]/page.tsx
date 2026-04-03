'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, ListChecks, Medal, Plus } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { PoolDetail, PoolEntry } from '@/types/api';
import { PoolContextTabs } from '@/components/layout/pool-context-tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatePanel } from '@/components/ui/state-panel';

export default function PoolDetailPage() {
  const params = useParams<{ poolId: string }>();
  const poolId = params.poolId;

  const { token } = useAuth();
  const [pool, setPool] = useState<PoolDetail | null>(null);
  const [entries, setEntries] = useState<PoolEntry[]>([]);
  const [entryName, setEntryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creatingEntry, setCreatingEntry] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [poolData, entryData] = await Promise.all([
        api.getPool(poolId, token),
        api.listMyEntries(poolId, token),
      ]);
      setPool(poolData);
      setEntries(entryData);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar la pool.');
    } finally {
      setLoading(false);
    }
  }, [poolId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const onCreateEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setCreatingEntry(true);
    setError(null);

    try {
      await api.createEntry(poolId, entryName.trim() || 'Mi Entry', token);
      setEntryName('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el entry.');
    } finally {
      setCreatingEntry(false);
    }
  };

  if (loading) {
    return <StatePanel variant="loading" description="Cargando detalle de la pool..." />;
  }

  if (error) {
    return <StatePanel variant="error" description={error} actionLabel="Reintentar" onAction={() => void load()} />;
  }

  if (!pool) {
    return <StatePanel variant="empty" description="Pool no encontrada o sin acceso para este usuario." />;
  }

  return (
    <div className="grid gap-4">
      <PoolContextTabs poolId={poolId} entryId={entries[0]?.id} />

      <header className="rounded-2xl border border-border/70 bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-extrabold">{pool.name}</h1>
          <Badge>{pool.status}</Badge>
          {pool.membership ? <Badge variant="muted">{pool.membership.role}</Badge> : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{pool.description ?? 'Sin descripcion'}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>Join code: {pool.joinCode ?? 'N/A'}</span>
          <span>Exacto: {pool.pointsExactScore}</span>
          <span>Outcome: {pool.pointsMatchOutcome}</span>
          <span>Bonus: {pool.pointsBonusCorrect}</span>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Mis entries</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {entries.length === 0 ? (
              <StatePanel variant="empty" description="Aun no tienes entries en esta pool." />
            ) : (
              entries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/pools/${poolId}/entries/${entry.id}`}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-white/70 px-3 py-2 text-sm hover:border-primary/40"
                >
                  <span>
                    {entry.entryName ?? `Entry ${entry.entryNumber}`} · {entry.totalPoints} pts
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Crear entry</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-2" onSubmit={onCreateEntry}>
              <Input
                placeholder="Nombre de tu entry"
                value={entryName}
                onChange={(e) => setEntryName(e.target.value)}
                minLength={2}
                maxLength={80}
              />
              <Button type="submit" disabled={creatingEntry}>
                <Plus className="mr-2 h-4 w-4" />
                {creatingEntry ? 'Creando...' : 'Crear Entry'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-2 sm:grid-cols-2">
        <Link href={`/pools/${poolId}/leaderboard`} className="inline-flex">
          <Button className="w-full gap-2">
            <Medal className="h-4 w-4" />
            Ver leaderboard
          </Button>
        </Link>
        <Link href={`/pools/${poolId}/entries/${entries[0]?.id ?? ''}`} className="inline-flex">
          <Button variant="outline" className="w-full gap-2" disabled={!entries[0]}>
            <ListChecks className="h-4 w-4" />
            Ir a predicciones
          </Button>
        </Link>
      </section>
    </div>
  );
}
