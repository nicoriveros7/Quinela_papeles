'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from '@/lib/utils';

type PoolContextTabsProps = {
  poolId: string;
  entryId?: string;
};

export function PoolContextTabs({ poolId, entryId }: PoolContextTabsProps) {
  const pathname = usePathname();

  const links = [
    {
      href: `/pools/${poolId}`,
      label: 'Overview',
      active: pathname === `/pools/${poolId}`,
    },
    {
      href: `/pools/${poolId}/leaderboard`,
      label: 'Leaderboard',
      active: pathname.startsWith(`/pools/${poolId}/leaderboard`),
    },
    {
      href: entryId ? `/pools/${poolId}/entries/${entryId}` : '',
      label: 'Predicciones',
      active: pathname.startsWith(`/pools/${poolId}/entries/`),
      disabled: !entryId,
    },
  ];

  return (
    <div className="overflow-x-auto rounded-2xl border border-border/70 bg-surface/90 p-2">
      <nav className="flex min-w-max gap-2">
        {links.map((link) =>
          link.disabled ? (
            <span
              key={link.label}
              className="rounded-xl border border-dashed border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground"
            >
              {link.label}
            </span>
          ) : (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] transition',
                link.active
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary',
              )}
            >
              {link.label}
            </Link>
          ),
        )}
      </nav>
    </div>
  );
}
