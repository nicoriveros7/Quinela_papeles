'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarDays, ChevronRight, Hash, Layers3 } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { AdminTournament } from '@/types/api';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';
import { cn } from '@/lib/utils';

function getStatusVariant(status: string): BadgeVariant {
  const s = status.toUpperCase();
  if (s === 'ACTIVE' || s === 'LIVE' || s === 'IN_PROGRESS') return 'success';
  if (s === 'CANCELLED') return 'danger';
  if (s === 'PENDING' || s === 'DRAFT' || s === 'UPCOMING' || s === 'PUBLISHED') return 'warning';
  return 'muted';
}

function getStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'Activo';
    case 'LIVE': return 'En vivo';
    case 'PUBLISHED': return 'Publicado';
    case 'IN_PROGRESS': return 'En curso';
    case 'FINISHED': return 'Finalizado';
    case 'COMPLETED': return 'Completado';
    case 'CANCELLED': return 'Cancelado';
    case 'ARCHIVED': return 'Archivado';
    case 'PENDING': return 'Pendiente';
    case 'DRAFT': return 'Borrador';
    case 'UPCOMING': return 'Próximo';
    default: return status;
  }
}

export default function AdminTournamentsPage() {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
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

  if (loading) return <StatePanel variant="loading" description="Cargando torneos..." />;
  if (error) return <StatePanel variant="error" description={error} />;

  return (
    <div className="grid gap-4">
      {/* ── Page header ───────────────────────────────────────────── */}
      <header className="rounded-2xl border border-white/[0.08] bg-surface p-5">
        <h1 className="text-xl font-extrabold text-foreground">Torneos</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {tournaments.length > 0
            ? `${tournaments.length} torneo${tournaments.length !== 1 ? 's' : ''} registrado${tournaments.length !== 1 ? 's' : ''}`
            : 'Sin torneos registrados'}
        </p>
      </header>

      {tournaments.length === 0 ? (
        <StatePanel variant="empty" description="No hay torneos registrados." />
      ) : (
        <>
          {/* ── Mobile cards (< md) ───────────────────────────────── */}
          <div className="grid gap-3 md:hidden">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="rounded-2xl border border-white/[0.08] bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{tournament.name}</p>
                    {tournament.shortName && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{tournament.shortName}</p>
                    )}
                  </div>
                  <Badge variant={getStatusVariant(tournament.status)} className="shrink-0 text-[11px]">
                    {getStatusLabel(tournament.status)}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDateTime(tournament.startDate)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Hash className="h-3.5 w-3.5" />
                    {tournament._count.matches} partidos
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Layers3 className="h-3.5 w-3.5" />
                    {tournament._count.pools} pools
                  </span>
                </div>

                <div className="mt-4 border-t border-border/40 pt-3">
                  <Link
                    href={`/admin/tournaments/${tournament.id}/matches`}
                    className={cn(
                      buttonVariants({ size: 'sm' }),
                      'w-full justify-center gap-1.5',
                    )}
                  >
                    Operar torneo
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table (md+) ───────────────────────────────── */}
          <Card className="hidden md:block">
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-background/40 text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Nombre
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Estado
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Partidos
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Pools
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Inicio
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {tournaments.map((tournament) => (
                    <tr
                      key={tournament.id}
                      className="group border-b border-white/[0.06] transition-colors last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-foreground">{tournament.name}</p>
                        {tournament.shortName && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{tournament.shortName}</p>
                        )}
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge
                          variant={getStatusVariant(tournament.status)}
                          className="text-[11px]"
                        >
                          {getStatusLabel(tournament.status)}
                        </Badge>
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-muted-foreground">
                        {tournament._count.matches}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-muted-foreground">
                        {tournament._count.pools}
                      </td>
                      <td className="px-3 py-3.5 text-muted-foreground">
                        {formatDateTime(tournament.startDate)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/admin/tournaments/${tournament.id}/matches`}
                          className={cn(
                            buttonVariants({ variant: 'outline', size: 'sm' }),
                            'gap-1.5 transition-colors group-hover:border-primary/50 group-hover:text-primary',
                          )}
                        >
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
        </>
      )}
    </div>
  );
}
