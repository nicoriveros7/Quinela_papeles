'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, LogOut, Medal, ShieldCheck, Target, Users } from 'lucide-react';

import { useAuth } from '@/providers/auth-provider';

import { Button } from '../ui/button';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/pools', label: 'Pools', icon: Users },
  { href: '/pools/join', label: 'Unirme', icon: Target },
];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isBootstrapping, user, logout } = useAuth();

  if (isBootstrapping) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Cargando sesion...
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-border/70 bg-surface/95 px-4 py-4 backdrop-blur lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
              <Medal className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.09em] text-primary">Quinela Pro</p>
              <p className="text-xs text-muted-foreground">Fantasy Futbol MVP</p>
            </div>
          </div>

          <nav className="grid gap-2">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
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

          <div className="mt-8 rounded-xl border border-border bg-white/70 p-3 text-sm">
            <p className="font-semibold text-foreground">{user?.displayName}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                {user?.systemRole}
              </span>
              <Button size="sm" variant="ghost" onClick={logout} className="h-8 px-2 text-xs">
                <LogOut className="mr-1 h-3.5 w-3.5" />
                Salir
              </Button>
            </div>
          </div>
        </aside>

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">{children}</main>
      </div>
    </div>
  );
}
