'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Globe,
  LayoutList,
  ListChecks,
  LogOut,
  Medal,
  ShieldCheck,
  ShieldUser,
  Star,
  Swords,
  Trophy,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

import { Button } from '../ui/button';

// ── Types ─────────────────────────────────────────────────────────────────────

type NavLink = {
  href: string;
  /** Full label shown in the sidebar */
  label: string;
  /** Short label for the bottom nav (≤10 chars recommended) */
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  activeWhen?: (pathname: string) => boolean;
};

// ── Nav definitions ──────────────────────────────────────────────────────────

/** Quiniela links — visible to ALL users in sidebar and bottom nav */
const quinielaLinks: NavLink[] = [
  {
    href: '/dashboard',
    label: 'Mi Quiniela',
    shortLabel: 'Quiniela',
    icon: Globe,
    activeWhen: (p) =>
      p === '/dashboard' ||
      (p.startsWith('/pools/') && !p.includes('/leaderboard') && !p.includes('/entries')),
  },
  {
    href: '/quiniela/partidos',
    label: 'Partidos',
    icon: Swords,
  },
  {
    href: '/quiniela/predicciones',
    label: 'Mis predicciones',
    shortLabel: 'Predecir',
    icon: ListChecks,
    activeWhen: (p) =>
      (p.startsWith('/quiniela/predicciones') &&
        !p.startsWith('/quiniela/predicciones-torneo')) ||
      p.includes('/entries/'),
  },
  {
    href: '/quiniela/leaderboard',
    label: 'Ranking',
    icon: Trophy,
    activeWhen: (p) => p.startsWith('/quiniela/leaderboard') || p.includes('/leaderboard'),
  },
  {
    href: '/quiniela/predicciones-torneo',
    label: 'Pre-torneo',
    icon: Star,
  },
];

/** Admin-only links — only shown in the desktop sidebar for ADMIN / SUPER_ADMIN */
const adminLinks: NavLink[] = [
  {
    href: '/pools',
    label: 'Pools',
    icon: LayoutList,
    activeWhen: (p) =>
      p.startsWith('/pools') && !p.includes('/entries/') && !p.includes('/leaderboard'),
  },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function isActive(link: NavLink, pathname: string): boolean {
  return link.activeWhen
    ? link.activeWhen(pathname)
    : pathname === link.href || pathname.startsWith(`${link.href}/`);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SidebarLink({ link, pathname }: { link: NavLink; pathname: string }) {
  const active = isActive(link, pathname);
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'inline-flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold',
        'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        active
          ? 'bg-primary text-primary-foreground shadow-card-sm'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {link.label}
    </Link>
  );
}

function BottomNavItem({ link, pathname }: { link: NavLink; pathname: string }) {
  const active = isActive(link, pathname);
  const Icon = link.icon;
  return (
    <Link
      href={link.href}
      aria-current={active ? 'page' : undefined}
      aria-label={link.label}
      className={cn(
        // Full flex column, fills the nav height — guarantees ≥44px touch target
        'relative flex flex-1 flex-col items-center justify-center gap-1 px-1 pt-2 pb-1',
        'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      {/* Top indicator bar for active state */}
      {active && (
        <span
          aria-hidden="true"
          className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
        />
      )}
      <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
      <span className="text-[10px] font-semibold leading-none">
        {link.shortLabel ?? link.label}
      </span>
    </Link>
  );
}

// ── AuthGuard ─────────────────────────────────────────────────────────────────

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isBootstrapping, user, logout } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Cargando sesión…
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const isAdmin = user?.systemRole === 'ADMIN' || user?.systemRole === 'SUPER_ADMIN';

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Mobile sticky header ────────────────────────────────────────────
          Visible only on < lg. Shows brand + logout. Nav lives in bottom bar. */}
      <header className="lg:hidden sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border/70 bg-surface/95 px-4 backdrop-blur">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card-sm"
          >
            <Medal className="h-4 w-4" />
          </span>
          <div className="leading-none">
            <p className="text-xs font-bold uppercase tracking-[0.09em] text-primary">
              Mundial 2026
            </p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Quiniela oficial</p>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={logout}
          aria-label="Cerrar sesión"
          className="h-9 gap-1.5 px-3 text-xs text-muted-foreground"
        >
          <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          Salir
        </Button>
      </header>

      {/* ── App shell ───────────────────────────────────────────────────────── */}
      <div className="mx-auto flex w-full max-w-7xl lg:min-h-screen lg:flex-row">

        {/* ── Desktop sidebar ────────────────────────────────────────────────
            Hidden on mobile — navigation is handled by the bottom bar there. */}
        <aside className="hidden lg:flex lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:flex-col lg:overflow-y-auto border-r border-border/70 bg-surface/98 px-5 py-6">

          {/* Brand */}
          <div className="mb-7 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card"
            >
              <Medal className="h-5 w-5" />
            </span>
            <div className="leading-none">
              <p className="text-sm font-bold uppercase tracking-[0.09em] text-primary">
                Mundial 2026
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isAdmin ? 'Panel de administración' : 'Quiniela oficial'}
              </p>
            </div>
          </div>

          {/* ── Quiniela navigation ── */}
          <nav aria-label="Quiniela" className="grid gap-0.5">
            <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Quiniela
            </p>
            {quinielaLinks.map((link) => (
              <SidebarLink key={link.href} link={link} pathname={pathname} />
            ))}
          </nav>

          {/* ── Admin navigation (ADMIN / SUPER_ADMIN only) ── */}
          {isAdmin ? (
            <nav aria-label="Administración" className="mt-6 grid gap-0.5">
              <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Administración
              </p>
              {adminLinks.map((link) => (
                <SidebarLink key={link.href} link={link} pathname={pathname} />
              ))}
              {/* Admin Console — visually distinct as a primary CTA */}
              <Link
                href="/admin"
                aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
                className={cn(
                  'mt-1 inline-flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm font-semibold',
                  'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                  pathname.startsWith('/admin')
                    ? 'border-primary/40 bg-primary/10 text-primary shadow-card-sm'
                    : 'border-primary/25 bg-primary/5 text-primary hover:border-primary/40 hover:bg-primary/10',
                )}
              >
                <ShieldUser className="h-4 w-4 shrink-0" aria-hidden="true" />
                Admin Console
              </Link>
            </nav>
          ) : null}

          {/* ── User card — mt-auto pushes it to the bottom of the sidebar ── */}
          <div className="mt-auto pt-6">
            <div className="rounded-xl border border-border/70 bg-muted/40 p-3.5">
              <p className="truncate text-sm font-semibold text-foreground">
                {user?.displayName}
              </p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              <div className="mt-3 flex items-center justify-end gap-2">
                {isAdmin ? (
                  <span className="mr-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
                    {user?.systemRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}
                  </span>
                ) : null}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={logout}
                  aria-label="Cerrar sesión"
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                >
                  <LogOut className="h-3 w-3" aria-hidden="true" />
                  Salir
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Page content ────────────────────────────────────────────────────
            pb-24 on mobile = clearance above the fixed bottom nav (h-16 + buffer).
            lg:pb-7 restores the desktop bottom padding. */}
        <main className="min-w-0 flex-1 px-4 pt-5 pb-24 sm:px-6 lg:px-8 lg:py-7 lg:pb-7">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom navigation ────────────────────────────────────────
          Fixed to viewport bottom. Visible only on < lg.
          Each item fills its flex-1 column → guaranteed ≥44px touch target.
          paddingBottom: env(safe-area-inset-bottom) handles iPhone notch / home bar. */}
      <nav
        aria-label="Navegación principal"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex h-16 items-stretch border-t border-border/70 bg-surface/95 backdrop-blur"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {quinielaLinks.map((link) => (
          <BottomNavItem key={link.href} link={link} pathname={pathname} />
        ))}
      </nav>
    </div>
  );
}
