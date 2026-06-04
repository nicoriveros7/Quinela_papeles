'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight, Globe2, KeyRound, Users } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { AdminPool } from '@/types/api';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';
import { cn } from '@/lib/utils';

function getStatusVariant(status: string): BadgeVariant {
  const s = status.toUpperCase();
  if (s === 'ACTIVE' || s === 'OPEN') return 'success';
  if (s === 'CANCELLED') return 'danger';
  if (s === 'PENDING' || s === 'DRAFT') return 'warning';
  return 'muted';
}

function getStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'Activo';
    case 'OPEN': return 'Abierto';
    case 'FINISHED': return 'Finalizado';
    case 'COMPLETED': return 'Completado';
    case 'CLOSED': return 'Cerrado';
    case 'LOCKED': return 'Bloqueado';
    case 'CANCELLED': return 'Cancelado';
    case 'ARCHIVED': return 'Archivado';
    case 'PENDING': return 'Pendiente';
    case 'DRAFT': return 'Borrador';
    default: return status;
  }
}

export default function AdminPoolsPage() {
  const { token } = useAuth();
  const [pools, setPools] = useState<AdminPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
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

  if (loading) return <StatePanel variant="loading" description="Cargando pools..." />;
  if (error) return <StatePanel variant="error" description={error} />;

  const totalMembers = pools.reduce((acc, p) => acc + p._count.members, 0);

  return (
    <div className="grid gap-4">
      {/* ── Page header ───────────────────────────────────────────── */}
      <header className="rounded-2xl border border-white/[0.08] bg-surface p-5">
        <h1 className="text-xl font-extrabold text-foreground">Pools</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {pools.length > 0
            ? `${pools.length} pool${pools.length !== 1 ? 's' : ''} · ${totalMembers} participante${totalMembers !== 1 ? 's' : ''} en total`
            : 'Sin pools registrados'}
        </p>
      </header>

      {pools.length === 0 ? (
        <StatePanel variant="empty" description="No hay pools registrados." />
      ) : (
        <>
          {/* ── Mobile cards (< md) ───────────────────────────────── */}
          <div className="grid gap-3 md:hidden">
            {pools.map((pool) => (
              <div
                key={pool.id}
                className="rounded-2xl border border-white/[0.08] bg-surface p-4"
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-foreground">{pool.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{pool.slug}</p>
                  </div>
                  <Badge variant={getStatusVariant(pool.status)} className="shrink-0 text-[11px]">
                    {getStatusLabel(pool.status)}
                  </Badge>
                </div>

                {/* Meta */}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Globe2 className="h-3.5 w-3.5" />
                    {pool.tournament.name}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {pool._count.members} participante{pool._count.members !== 1 ? 's' : ''}
                  </span>
                  <span>{pool._count.entries} boleta{pool._count.entries !== 1 ? 's' : ''}</span>
                </div>

                {/* Join code */}
                {pool.joinCode && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <KeyRound className="h-3.5 w-3.5 shrink-0" />
                    <code className="rounded bg-background/50 px-1.5 py-0.5 font-mono text-foreground border border-white/[0.06]">
                      {pool.joinCode}
                    </code>
                  </div>
                )}

                {/* Action */}
                <div className="mt-4 border-t border-border/40 pt-3">
                  <Link
                    href={`/admin/pools/${pool.id}/matches`}
                    className={cn(
                      buttonVariants({ size: 'sm' }),
                      'w-full justify-center gap-1.5',
                    )}
                  >
                    Operar pool
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* ── Desktop table (md+) ───────────────────────────────── */}
          <Card className="hidden md:block">
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-white/[0.08] bg-background/40 text-left">
                    <th className="px-5 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Pool
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Torneo
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Estado
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Participantes
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Boletas
                    </th>
                    <th className="px-3 py-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                      Código
                    </th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {pools.map((pool) => (
                    <tr
                      key={pool.id}
                      className="group border-b border-white/[0.06] transition-colors last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-foreground">{pool.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{pool.slug}</p>
                      </td>
                      <td className="px-3 py-3.5 text-muted-foreground">
                        {pool.tournament.name}
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge variant={getStatusVariant(pool.status)} className="text-[11px]">
                          {getStatusLabel(pool.status)}
                        </Badge>
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-muted-foreground">
                        {pool._count.members}
                      </td>
                      <td className="px-3 py-3.5 text-right tabular-nums text-muted-foreground">
                        {pool._count.entries}
                      </td>
                      <td className="px-3 py-3.5">
                        {pool.joinCode ? (
                          <code className="rounded-md bg-background/50 px-2 py-1 font-mono text-xs text-foreground border border-white/[0.06]">
                            {pool.joinCode}
                          </code>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          href={`/admin/pools/${pool.id}/matches`}
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
