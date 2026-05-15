'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { BarChart3, Calendar, ChevronLeft, Home, LogOut, Menu, Shield, Users, X } from 'lucide-react';

import { useAuth } from '@/providers/auth-provider';
import { StatePanel } from '../ui/state-panel';

const links = [
  { href: '/admin', label: 'Resumen', icon: Home },
  { href: '/admin/tournaments', label: 'Torneos', icon: Calendar },
  { href: '/admin/pools', label: 'Pools', icon: Users },
];

function getInitials(name: string | null | undefined): string {
  if (!name) return 'A';
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function SidebarContent({
  pathname,
  displayName,
  email,
  systemRole,
  logout,
}: {
  pathname: string;
  displayName: string | null | undefined;
  email: string | null | undefined;
  systemRole: string | null | undefined;
  logout: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      {/* ── Brand ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-6">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
          <Shield className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.08em] text-foreground">Admin Console</p>
          <p className="text-xs text-muted-foreground">La Polla Mundialista 2026</p>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav className="grid gap-1 px-3">
        {links.map((link) => {
          const active =
            link.href === '/admin'
              ? pathname === link.href
              : pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom section ────────────────────────────────────── */}
      <div className="mt-auto flex flex-col">
        {/* Volver a User App */}
        <div className="border-t border-border/70 px-3 py-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4 shrink-0" />
            Volver a User App
          </Link>
        </div>

        {/* User info + logout */}
        <div className="border-t border-border/70 px-3 py-4">
          <div className="flex items-center gap-3 px-2 pb-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {getInitials(displayName)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            {systemRole && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-primary">
                <BarChart3 className="h-3 w-3" />
                {systemRole === 'SUPER_ADMIN' ? 'Super' : 'Admin'}
              </span>
            )}
          </div>

          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAuthenticated, isBootstrapping, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  if (isBootstrapping) {
    return <StatePanel variant="loading" description="Cargando consola admin..." />;
  }

  if (!isAuthenticated) {
    return null;
  }

  const isAdmin = user?.systemRole === 'ADMIN' || user?.systemRole === 'SUPER_ADMIN';
  if (!isAdmin) {
    return <StatePanel variant="error" description="No tienes permisos para acceder al panel admin." />;
  }

  const sidebarProps = {
    pathname,
    displayName: user?.displayName,
    email: user?.email,
    systemRole: user?.systemRole,
    logout,
  };

  return (
    <div className="min-h-dvh bg-muted/40">
      {/* ── Mobile top bar ────────────────────────────────────── */}
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/70 bg-surface px-4 py-3 xl:hidden">
        <button
          aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-3.5 w-3.5" />
          </span>
          <p className="text-sm font-bold uppercase tracking-[0.08em] text-foreground">Admin Console</p>
        </div>

        <div className="ml-auto">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {getInitials(user?.displayName)}
          </span>
        </div>
      </div>

      {/* ── Mobile overlay ────────────────────────────────────── */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 xl:hidden"
          aria-hidden="true"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* ── Mobile drawer ─────────────────────────────────────── */}
      <div
        className={`fixed left-0 top-0 z-50 h-dvh w-72 border-r border-border/70 bg-surface transition-transform duration-300 ease-in-out xl:hidden ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent {...sidebarProps} />
      </div>

      {/* ── Desktop layout ────────────────────────────────────── */}
      <div className="mx-auto flex w-full max-w-[1500px]">
        <aside className="hidden xl:sticky xl:top-0 xl:flex xl:h-screen xl:w-72 xl:shrink-0 xl:flex-col xl:border-r xl:border-border/70 xl:bg-surface">
          <SidebarContent {...sidebarProps} />
        </aside>
        <main className="min-h-dvh flex-1 px-4 py-4 sm:px-6 xl:px-8 xl:py-6">{children}</main>
      </div>
    </div>
  );
}
