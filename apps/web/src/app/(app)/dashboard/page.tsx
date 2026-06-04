'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  ListChecks,
  Medal,
  Shield,
  ShieldUser,
  Star,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { PoolMatch, WorldCupMainPool } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';
import { TeamLabel } from '@/components/ui/team-label';

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
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la polla');
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
    return <StatePanel variant="loading" description="Cargando tu polla..." />;
  }

  if (error) {
    return <StatePanel variant="error" description={error} />;
  }

  if (!mainPool) return null;

  const entry = mainPool.mainEntry;

  return (
    <div className="grid gap-5 animate-fade-in">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-surface p-5 shadow-card sm:p-6">
        {/* Subtle premium glow */}
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 -z-10 h-full w-full opacity-40 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at top right, hsl(var(--primary) / 0.08), transparent 45%)',
          }}
        />

        <Badge variant="success" className="mb-3">FIFA World Cup 2026</Badge>
        <h1 className="truncate text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Hola, {user?.displayName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Predice todos los partidos, suma puntos y sube en el leaderboard.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-background/60 px-3 py-1.5 text-xs font-semibold text-foreground shadow-card-sm">
          <Shield className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          {mainPool.pool._count?.members ?? 0} participante{(mainPool.pool._count?.members ?? 0) !== 1 ? 's' : ''} · {mainPool.pool.tournament?.name ?? 'Mundial 2026'}
        </div>
      </section>

      {/* ── Stats + Acciones ─────────────────────────────────────────────── */}
      <section className="grid gap-3 sm:grid-cols-3">
        {/* Stats: 2-col on mobile, 1-col stacked on desktop sidebar */}
        <div className="grid grid-cols-2 gap-3 sm:col-span-1 sm:grid-cols-1 sm:grid-rows-2">
          <StatCard
            label="Mis puntos"
            value={entry.totalPoints}
            sub="puntos acumulados"
            accent
          />
          <StatCard
            label="Mi posición"
            value={entry.rank ? `#${entry.rank}` : '—'}
            sub={entry.rank ? 'en el leaderboard' : 'pendiente'}
          />
        </div>

        {/* CTAs: primary first, secondary 2-col */}
        <div className="grid gap-2.5 sm:col-span-2">
          <Link href="/polla/predicciones" className="block">
            <Button className="w-full gap-2">
              <ListChecks className="h-4 w-4" aria-hidden="true" />
              Mis predicciones
            </Button>
          </Link>
          <div className="grid grid-cols-2 gap-2.5">
            <Link href="/polla/leaderboard" className="block">
              <Button variant="outline" className="w-full gap-2">
                <Medal className="h-4 w-4" aria-hidden="true" />
                Ranking
              </Button>
            </Link>
            <Link href="/polla/partidos" className="block">
              <Button variant="outline" className="w-full gap-2">
                <CalendarDays className="h-4 w-4" aria-hidden="true" />
                Partidos
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Próximos partidos ─────────────────────────────────────────────── */}
      <section className="grid gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Próximos partidos
          </h2>
          <Link href="/polla/partidos">
            <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-xs text-muted-foreground">
              Ver todos
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Button>
          </Link>
        </div>

        {upcomingMatches.length === 0 ? (
          <StatePanel variant="empty" description="No hay partidos próximos disponibles." compact />
        ) : (
          <div className="grid gap-2">
            {upcomingMatches.map((match) => (
              <UpcomingMatchRow
                key={match.id}
                match={match}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Pre-torneo ───────────────────────────────────────────────────── */}
      <section className="grid gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Predicciones del torneo
        </h2>
        <UserFeatureCard
          href="/polla/predicciones-torneo"
          icon={Star}
          title="Pre-torneo"
          description="Predice el campeón, subcampeón y goleador del Mundial antes de que empiece."
        />
      </section>

      {/* ── Admin ────────────────────────────────────────────────────────── */}
      {isAdmin ? (
        <section className="grid gap-3">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
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

/** Stat card: points or rank display */
function StatCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: React.ReactNode;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-surface p-4 shadow-card-sm shadow-inner-subtle">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 text-4xl font-extrabold tabular-nums leading-none',
          accent ? 'text-primary' : 'text-foreground',
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

/** Upcoming match row — sport-style: home code | vs + time | away code */
function UpcomingMatchRow({ match }: { match: PoolMatch }) {
  const home = match.homeTournamentTeam?.team;
  const away = match.awayTournamentTeam?.team;
  const homeCode = home?.code ?? match.homeSlotLabel ?? 'TBD';
  const awayCode = away?.code ?? match.awaySlotLabel ?? 'TBD';
  const homeName = home?.name ?? match.homeSlotLabel ?? 'Por definir';
  const awayName = away?.name ?? match.awaySlotLabel ?? 'Por definir';
  const kickoff = new Date(match.kickoffAt);
  const timeStr = kickoff.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  const dateStr = kickoff.toLocaleDateString('es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const stageStr =
    match.stage === 'GROUP' && match.group
      ? `Grupo ${match.group.code}`
      : match.stage;

  return (
    <Link
      href="/polla/predicciones"
      className="group flex items-center gap-2 rounded-xl border border-white/[0.08] bg-surface px-4 py-3.5 shadow-card-sm shadow-inner-subtle transition-all duration-150 hover:border-primary/30 hover:shadow-card"
    >
      {/* Home */}
      <div className="flex min-w-0 flex-1 flex-col items-end">
        <TeamLabel
          name={homeName}
          code={homeCode}
          flagEmoji={home?.flagEmoji}
          format="compact"
          className="text-sm font-extrabold leading-none text-foreground"
        />
        <span className="mt-0.5 max-w-[80px] truncate text-[11px] text-muted-foreground">
          {home?.name ?? ''}
        </span>
      </div>

      {/* Center: vs + time + date */}
      <div className="flex flex-col items-center gap-0.5 px-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
          vs
        </span>
        <span className="text-xs font-semibold tabular-nums text-foreground">{timeStr}</span>
        <span className="text-[10px] text-muted-foreground">{dateStr}</span>
      </div>

      {/* Away */}
      <div className="flex min-w-0 flex-1 flex-col items-start">
        <TeamLabel
          name={awayName}
          code={awayCode}
          flagEmoji={away?.flagEmoji}
          format="compact"
          className="text-sm font-extrabold leading-none text-foreground"
        />
        <span className="mt-0.5 max-w-[80px] truncate text-[11px] text-muted-foreground">
          {away?.name ?? ''}
        </span>
      </div>

      {/* Stage + arrow */}
      <div className="flex shrink-0 flex-col items-end gap-1 pl-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {stageStr}
        </span>
        <ArrowRight
          className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}

/** User-facing feature card — uses Card interactive for tactile feedback */
function UserFeatureCard({
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
    <Link href={href} className="block">
      <Card interactive className="p-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">{title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          </div>
          <ArrowRight
            className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
      </Card>
    </Link>
  );
}

/** Admin-only link card — visually distinct from UserFeatureCard */
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
      className="block rounded-2xl border border-primary/20 bg-primary/5 p-4 transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card-sm"
    >
      <div className="mb-2 inline-flex rounded-xl bg-primary/10 p-2 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
        Ir ahora
        <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    </Link>
  );
}
