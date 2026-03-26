import { ArrowRight, Trophy } from 'lucide-react';

import { AppSurface } from '@quinela/types';

import { Button } from '@/components/ui/button';

const highlights = [
  'Monorepo listo para escalar por torneo',
  'Backend NestJS con health endpoint',
  'Frontend Next.js con base shadcn/ui',
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-pitch" />
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-10 sm:px-8 lg:px-12">
        <header className="mb-12 flex items-center justify-between">
          <span className="rounded-full border border-border/60 bg-white/70 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-900 backdrop-blur">
            Fase 1 · {AppSurface.Web}
          </span>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-900/70">World Cup 2026 MVP</span>
        </header>

        <section className="grid gap-8 rounded-3xl border border-border/70 bg-white/85 p-6 shadow-card backdrop-blur sm:p-8 lg:grid-cols-[1.15fr_0.85fr] lg:p-10">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-emerald-800">
              <Trophy className="h-4 w-4" />
              Plataforma de quinielas
            </div>
            <h1 className="max-w-xl text-3xl font-extrabold leading-tight text-emerald-950 sm:text-4xl">
              Base tecnica lista para construir una quiniela profesional, moderna y escalable.
            </h1>
            <p className="max-w-lg text-sm leading-relaxed text-emerald-900/80 sm:text-base">
              Esta pantalla es un placeholder de arranque. El monorepo ya integra web, API y packages compartidos para empezar la Fase 2 sin deuda tecnica inicial.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button className="gap-2 bg-emerald-700 text-white hover:bg-emerald-800">
                Empezar desarrollo
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="border-emerald-300 text-emerald-900">
                Ver roadmap del MVP
              </Button>
            </div>
          </div>

          <aside className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 sm:p-5">
            <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-emerald-900/85">Estado del bootstrap</h2>
            <ul className="space-y-2">
              {highlights.map((item) => (
                <li key={item} className="rounded-xl border border-emerald-200/70 bg-white/70 px-3 py-2 text-sm text-emerald-900">
                  {item}
                </li>
              ))}
            </ul>
          </aside>
        </section>
      </div>
    </main>
  );
}
