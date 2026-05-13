'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ListChecks,
  Medal,
  Shield,
  ShieldUser,
  Star,
  Swords,
} from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { PoolMatch, WorldCupMainPool } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

export default function DashboardPage() {
  const { token, user } = useAuth();
  const isAdmin = user?.systemRole === 'ADMIN' || user?.systemRole === 'SUPER_ADMIN';

  const [mainPool, setMainPool] = useState<WorldCupMainPool | null>(null);
  const [matches, setMatches] = useState<PoolMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getMyMainPool(token);
        setMainPool(data);
        const matchData = await api.listPoolMatches(data.pool.id, token);
        setMatches(matchData.matches);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la quiniela');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [token]);

  const upcomingMatches = useMemo(
    () =>
      matches
        .filter((m) => m.status === 'SCHEDULED')
        .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime())
        .slice(0, 5),
    [matches],
  );

  if (loading) {
    return <StatePanel variant="loading" description="Cargando tu quiniela..." />;
  }

  if (error) {
    return <StatePanel variant="error" description={error} />;
  }

  if (!mainPool) return null;

  const entry = mainPool.mainEntry;
  const poolId = mainPool.pool.id;

  return (
    <div className="grid gap-5">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="rounded-3xl border border-white/20 bg-stadium p-5 shadow-card sm:p-6">
        <Badge variant="success" className="mb-3">FIFA World Cup 2026</Badge>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Hola, {user?.displayName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Bienvenido a la Quiniela Mundial 2026. Predice todos los partidos, suma puntos y sube en el leaderboard.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-surface/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
          <Shield className="h-3.5 w-3.5" />
          {mainPool.pool._count?.members ?? 0} participantes · {mainPool.pool.tournament?.name ?? 'Mundial 2026'}
        </div>
      </section>

      {/* ── Mis puntos + acciones ─────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-3 sm:col-span-1 sm:grid-rows-2">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">Mis puntos</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-3xl font-extrabold">{entry.totalPoints}</p>
              <p className="text-xs text-muted-foreground">puntos acumulados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1">
              <CardTitle className="text-sm">Mi posición</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-3xl font-extrabold">
                {entry.rank ? `#${entry.rank}` : '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                {entry.rank ? 'en el leaderboard' : 'pendiente de calcular'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-3 sm:col-span-2 sm:grid-rows-3">
          <Link href={`/pools/${poolId}/entries/${entry.id}`} className="inline-flex">
            <Button className="w-full gap-2 h-full min-h-[44px]">
              <ListChecks className="h-4 w-4" />
              Mis predicciones
            </Button>
          </Link>
          <Link href="/quiniela/leaderboard" className="inline-flex">
            <Button variant="outline" className="w-full gap-2 h-full min-h-[44px]">
              <Medal className="h-4 w-4" />
              Leaderboard
            </Button>
          </Link>
          <Link href="/quiniela/partidos" className="inline-flex">
            <Button variant="outline" className="w-full gap-2 h-full min-h-[44px]">
              <Swords className="h-4 w-4" />
              Ver todos los partidos
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Próximos partidos ─────────────────────────────────────────────── */}
      <section className="grid gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Próximos partidos
        </h2>

        {upcomingMatches.length === 0 ? (
          <StatePanel variant="empty" description="No hay partidos próximos disponibles." compact />
        ) : (
          <div className="grid gap-2">
            {upcomingMatches.map((match) => (
              <UpcomingMatchRow
                key={match.id}
                match={match}
                poolId={poolId}
                entryId={entry.id}
              />
            ))}
          </div>
        )}

        <Link href="/quiniela/partidos" className="inline-flex">
          <Button variant="outline" size="sm" className="gap-1">
            Ver todos los partidos
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </section>

      {/* ── Predicciones del torneo ───────────────────────────────────────── */}
      <section className="grid gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Predicciones del torneo
        </h2>
        <AdminQuickLink
          href="/quiniela/predicciones-torneo"
          icon={Star}
          title="Pre-torneo"
          description="Predice el campeón, subcampeón y goleador del Mundial antes de que empiece."
        />
      </section>

      {/* ── Sección admin ────────────────────────────────────────────────── */}
      {isAdmin ? (
        <section className="grid gap-3">
          <h2 className="text-sm font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Administración
          </h2>
          <AdminQuickLink
            href="/admin"
            icon={ShieldUser}
            title="Admin Console"
            description="Gestiona torneos, partidos, pools, preguntas y resultados."
          />
        </section>
      ) : null}
    </div>
  );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function UpcomingMatchRow({
  match,
  poolId,
  entryId,
}: {
  match: PoolMatch;
  poolId: string;
  entryId: string;
}) {
  const home = match.homeTournamentTeam?.team;
  const away = match.awayTournamentTeam?.team;
  const kickoff = new Date(match.kickoffAt);
  const dateStr = kickoff.toLocaleDateString('es', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = kickoff.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });

  return (
    <Link
      href={`/pools/${poolId}/entries/${entryId}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-surface/90 px-4 py-3 text-sm transition hover:border-primary/40"
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground">
          {home ? home.name : (match.homeSlotLabel ?? '?')} vs{' '}
          {away ? away.name : (match.awaySlotLabel ?? '?')}
        </p>
        <p className="text-xs text-muted-foreground">
          {match.stage === 'GROUP' && match.group ? `Grupo ${match.group.code} · ` : ''}
          {dateStr} · {timeStr}
        </p>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

function AdminQuickLink({
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
    <Link
      href={href}
      className="group rounded-2xl border border-primary/20 bg-primary/5 p-4 transition hover:-translate-y-0.5 hover:border-primary/40"
    >
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
