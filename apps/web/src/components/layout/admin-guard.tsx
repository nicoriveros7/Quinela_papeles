'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, Calendar, Home, Layers3, LogOut, Shield, Users } from 'lucide-react';

import { useAuth } from '@/providers/auth-provider';

import { Button } from '../ui/button';
import { StatePanel } from '../ui/state-panel';

const links = [
  { href: '/admin', label: 'Resumen', icon: Home },
  { href: '/admin/tournaments', label: 'Torneos', icon: Calendar },
  { href: '/admin/pools', label: 'Pools', icon: Users },
];

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isAuthenticated, isBootstrapping, logout } = useAuth();

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

  return (
    <div className="min-h-screen bg-muted/40">
      <div className="mx-auto flex min-h-screen w-full max-w-[1500px] flex-col xl:flex-row">
        <aside className="border-b border-border/70 bg-surface px-4 py-4 xl:sticky xl:top-0 xl:h-screen xl:w-72 xl:border-b-0 xl:border-r xl:px-5 xl:py-6">
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
              <Shield className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-foreground">Admin Console</p>
              <p className="text-xs text-muted-foreground">Quinela Pro MVP</p>
            </div>
          </div>

          <nav className="grid gap-2">
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
                  className={`inline-flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 rounded-xl border border-border bg-white p-3 text-sm">
            <p className="font-semibold text-foreground">{user?.displayName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              <BarChart3 className="h-3.5 w-3.5" />
              {user?.systemRole}
            </div>
            <div className="mt-3 grid gap-2">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="w-full">
                  <Layers3 className="mr-2 h-4 w-4" />
                  Volver a User App
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout} className="w-full">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesion
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1 px-4 py-4 sm:px-6 xl:px-8 xl:py-6">{children}</main>
      </div>
    </div>
  );
}
