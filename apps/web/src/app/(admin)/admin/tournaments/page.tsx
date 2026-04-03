'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { AdminTournament } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

export default function AdminTournamentsPage() {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
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
        setTournaments(await api.adminListTournaments(token));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar torneos.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  if (loading) {
    return <StatePanel variant="loading" description="Cargando torneos..." />;
  }

  if (error) {
    return <StatePanel variant="error" description={error} />;
  }

  if (tournaments.length === 0) {
    return <StatePanel variant="empty" description="No hay torneos registrados." />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Torneos</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-border/70 text-left text-xs uppercase tracking-[0.08em] text-muted-foreground">
              <th className="pb-2">Nombre</th>
              <th className="pb-2">Estado</th>
              <th className="pb-2">Matches</th>
              <th className="pb-2">Pools</th>
              <th className="pb-2">Inicio</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map((tournament) => (
              <tr key={tournament.id} className="border-b border-border/50">
                <td className="py-2 font-semibold">{tournament.name}</td>
                <td className="py-2"><Badge variant="muted">{tournament.status}</Badge></td>
                <td className="py-2">{tournament._count.matches}</td>
                <td className="py-2">{tournament._count.pools}</td>
                <td className="py-2">{formatDateTime(tournament.startDate)}</td>
                <td className="py-2 text-right">
                  <Link href={`/admin/tournaments/${tournament.id}/matches`} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
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
