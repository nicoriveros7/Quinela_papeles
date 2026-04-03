'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { AdminPool } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

export default function AdminPoolsPage() {
  const { token } = useAuth();
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
        setPools(await api.adminListPools(token));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar pools.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  if (loading) {
    return <StatePanel variant="loading" description="Cargando pools..." />;
  }

  if (error) {
    return <StatePanel variant="error" description={error} />;
  }

  if (pools.length === 0) {
    return <StatePanel variant="empty" description="No hay pools registrados." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pools</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead>
            <tr className="border-b border-border/70 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
              <th className="pb-2">Pool</th>
              <th className="pb-2">Torneo</th>
              <th className="pb-2">Estado</th>
              <th className="pb-2">Participantes</th>
              <th className="pb-2">Cierre picks</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {pools.map((pool) => (
              <tr key={pool.id} className="border-b border-border/50">
                <td className="py-2 font-semibold">{pool.name}</td>
                <td className="py-2">{pool.tournament.name}</td>
                <td className="py-2"><Badge variant="muted">{pool.status}</Badge></td>
                <td className="py-2">{pool._count.members}</td>
                <td className="py-2">{pool.joinCode ?? '-'}</td>
                <td className="py-2 text-right">
                  <Link href={`/admin/pools/${pool.id}/matches`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    Operar
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
