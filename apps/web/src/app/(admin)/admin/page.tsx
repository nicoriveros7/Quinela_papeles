'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronRight, Globe2, Lock, LockOpen, Users, type LucideIcon } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { AdminPool, AdminTournament, AdminTournamentPredictionLock } from '@/types/api';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

function getStatusVariant(status: string): BadgeVariant {
  const s = status.toUpperCase();
  if (s === 'ACTIVE' || s === 'LIVE' || s === 'OPEN') return 'success';
  if (s === 'CANCELLED') return 'danger';
  if (s === 'PENDING' || s === 'DRAFT' || s === 'UPCOMING') return 'warning';
  return 'muted';
}

function getStatusLabel(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'Activo';
    case 'LIVE': return 'En vivo';
    case 'OPEN': return 'Abierto';
    case 'FINISHED': return 'Finalizado';
    case 'COMPLETED': return 'Completado';
    case 'CLOSED': return 'Cerrado';
    case 'CANCELLED': return 'Cancelado';
    case 'PENDING': return 'Pendiente';
    case 'DRAFT': return 'Borrador';
    case 'UPCOMING': return 'Próximo';
    default: return status;
  }
}

export default function AdminHomePage() {
  const { token } = useAuth();
  const [tournaments, setTournaments] = useState<AdminTournament[]>([]);
  const [pools, setPools] = useState<AdminPool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [predictionLock, setPredictionLock] = useState<AdminTournamentPredictionLock | null>(null);
  const [lockLoading, setLockLoading] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);

  const MAIN_TOURNAMENT_SLUG = 'world-cup-2026';

  useEffect(() => {
    if (!token) return;

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

        const mainTournament = tournamentsData.find((t) => t.slug === MAIN_TOURNAMENT_SLUG);
        if (mainTournament) {
          const lock = await api.adminGetTournamentPredictionLock(mainTournament.id, token);
          setPredictionLock(lock);
        }
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
    const totalMembers = pools.reduce((acc, p) => acc + p._count.members, 0);
    return {
      totalTournaments: tournaments.length,
      totalMatches,
      totalPools: pools.length,
      totalMembers,
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
      {/* ── Page header ──────────────────────────────────────────── */}
      <header className="rounded-2xl border border-border/70 bg-surface p-5">
        <h1 className="text-2xl font-extrabold text-foreground">Admin Console</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Gestión operativa de torneos, partidos y bonus questions.
        </p>
      </header>

      {/* ── Metrics ──────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          icon={Globe2}
          title="Torneos"
          value={stats.totalTournaments}
          description="registrados"
        />
        <MetricCard
          icon={CalendarDays}
          title="Partidos"
          value={stats.totalMatches}
          description="en total"
        />
        <MetricCard
          icon={Users}
          title="Pools"
          value={stats.totalPools}
          description={`· ${stats.totalMembers} participante${stats.totalMembers !== 1 ? 's' : ''}`}
        />
      </section>

      {/* ── Predicciones Pre-Torneo ──────────────────────────────── */}
      {predictionLock && (
        <TournamentPredictionControlCard
          lock={predictionLock}
          loading={lockLoading}
          error={lockError}
          onToggle={async (locked) => {
            if (!token) return;
            setLockLoading(true);
            setLockError(null);
            try {
              const updated = await api.adminUpdateTournamentPredictionLock(
                predictionLock.tournamentId,
                { locked },
                token,
              );
              setPredictionLock(updated);
            } catch (err) {
              setLockError(err instanceof ApiError ? err.message : 'Error al cambiar el estado');
            } finally {
              setLockLoading(false);
            }
          }}
          onUpdateLockAt={async (lockAt) => {
            if (!token) return;
            setLockLoading(true);
            setLockError(null);
            try {
              const updated = await api.adminUpdateTournamentPredictionLock(
                predictionLock.tournamentId,
                { lockAt },
                token,
              );
              setPredictionLock(updated);
            } catch (err) {
              setLockError(err instanceof ApiError ? err.message : 'Error al actualizar la fecha');
            } finally {
              setLockLoading(false);
            }
          }}
        />
      )}

      {/* ── Recent lists ─────────────────────────────────────────── */}
      <section className="grid gap-3 xl:grid-cols-2">
        {/* Tournaments */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Torneos recientes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {tournaments.length === 0 && (
              <StatePanel variant="empty" description="No hay torneos creados todavía." compact />
            )}

            {tournaments.slice(0, 5).map((tournament) => (
              <Link
                key={tournament.id}
                href={`/admin/tournaments/${tournament.id}/matches`}
                className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{tournament.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {tournament._count.matches} partidos · {tournament._count.pools} pools
                  </p>
                </div>
                <Badge variant={getStatusVariant(tournament.status)} className="ml-3 shrink-0 text-[11px]">
                  {getStatusLabel(tournament.status)}
                </Badge>
              </Link>
            ))}

            <Link
              href="/admin/tournaments"
              className="inline-flex items-center gap-1 pt-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary hover:underline"
            >
              Ver todos
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>

        {/* Pools */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pools recientes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {pools.length === 0 && (
              <StatePanel variant="empty" description="No hay pools creados todavía." compact />
            )}

            {pools.slice(0, 5).map((pool) => (
              <Link
                key={pool.id}
                href={`/admin/pools/${pool.id}/matches`}
                className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">{pool.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {pool.tournament.name} · {pool._count.members} participante{pool._count.members !== 1 ? 's' : ''}
                  </p>
                </div>
                <Badge variant={getStatusVariant(pool.status)} className="ml-3 shrink-0 text-[11px]">
                  {getStatusLabel(pool.status)}
                </Badge>
              </Link>
            ))}

            <Link
              href="/admin/pools"
              className="inline-flex items-center gap-1 pt-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary hover:underline"
            >
              Ver todos
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: LucideIcon;
  title: string;
  value: number;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="py-5">
        <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {title}
        </p>
        <p className="mt-1 text-3xl font-extrabold tabular-nums text-foreground">{value}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function formatDateTimeLocal(isoString: string): string {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function TournamentPredictionControlCard({
  lock,
  loading,
  error,
  onToggle,
  onUpdateLockAt,
}: {
  lock: AdminTournamentPredictionLock;
  loading: boolean;
  error: string | null;
  onToggle: (locked: boolean) => Promise<void>;
  onUpdateLockAt: (lockAt: string | null) => Promise<void>;
}) {
  const [editingDate, setEditingDate] = useState(false);
  const [dateInput, setDateInput] = useState(lock.lockAt ? formatDateTimeLocal(lock.lockAt) : '');

  const handleSaveDate = async () => {
    const iso = dateInput ? new Date(dateInput).toISOString() : null;
    await onUpdateLockAt(iso);
    setEditingDate(false);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Predicciones Pre-Torneo</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <p className="text-xs text-muted-foreground">
          Las predicciones pre-torneo se cerrarán automáticamente al iniciar el torneo, salvo que un administrador las abra o cierre manualmente.
        </p>

        {/* Estado actual */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em]">Estado:</span>
          {lock.isLocked ? (
            <Badge variant="danger" className="gap-1">
              <Lock className="h-2.5 w-2.5" />
              Cerradas
            </Badge>
          ) : (
            <Badge variant="success" className="gap-1">
              <LockOpen className="h-2.5 w-2.5" />
              Abiertas
            </Badge>
          )}
          {lock.lockedManually && (
            <span className="text-[11px] text-muted-foreground">(override manual)</span>
          )}
        </div>

        {/* Fecha de cierre automático */}
        <div className="grid gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.08em]">
            Cierre automático:
          </span>
          {editingDate ? (
            <div className="flex items-center gap-2">
              <input
                type="datetime-local"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="rounded-lg border border-border/60 bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
              <Button size="sm" onClick={handleSaveDate} disabled={loading}>
                Guardar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingDate(false)}>
                Cancelar
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">
                {lock.lockAt
                  ? new Date(lock.lockAt).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
                  : 'No configurada'}
              </span>
              <button
                onClick={() => {
                  setDateInput(lock.lockAt ? formatDateTimeLocal(lock.lockAt) : '');
                  setEditingDate(true);
                }}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Editar
              </button>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            disabled={loading || !lock.isLocked}
            onClick={() => void onToggle(false)}
            className="gap-1.5"
          >
            <LockOpen className="h-3.5 w-3.5" />
            Abrir
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={loading || lock.isLocked}
            onClick={() => void onToggle(true)}
            className="gap-1.5"
          >
            <Lock className="h-3.5 w-3.5" />
            Cerrar
          </Button>
        </div>

        {error && (
          <p className="text-xs font-semibold text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  );
}
