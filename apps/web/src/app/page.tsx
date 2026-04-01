import Link from 'next/link';
import { ArrowRight, Goal, Shield, Trophy, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Users,
    title: 'Pools entre amigos',
    description: 'Crea o unete con codigo y juega en grupos privados.',
  },
  {
    icon: Goal,
    title: 'Predicciones y bonus',
    description: 'Marca resultados, responde preguntas y suma puntos.',
  },
  {
    icon: Trophy,
    title: 'Leaderboard en vivo del MVP',
    description: 'Ranking claro por entry para competir jornada a jornada.',
  },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-stadium" />
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        <header className="mb-10 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
            <Shield className="h-3.5 w-3.5" />
            Quinela Pro
          </span>
          <Link href="/login" className="text-xs font-semibold uppercase tracking-[0.12em] text-primary hover:underline">
            Entrar
          </Link>
        </header>

        <section className="grid gap-6 rounded-3xl border border-white/20 bg-surface/90 p-6 shadow-card backdrop-blur sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
          <div className="space-y-6">
            <h1 className="text-3xl font-extrabold leading-tight text-foreground sm:text-4xl lg:text-5xl">
              Tu fantasy futbol, con experiencia real de producto.
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Quinela moderna para seguir torneos, competir en pools y dominar el ranking con estrategia.
              Mobile first, veloz y conectada a tu API NestJS.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex">
                <Button size="lg" className="gap-2">
                  Crear cuenta
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/login" className="inline-flex">
                <Button variant="outline" size="lg">
                  Ya tengo cuenta
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="rounded-2xl border border-border/60 bg-white/70 p-4">
                  <div className="mb-2 inline-flex rounded-lg bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-bold uppercase tracking-[0.08em] text-foreground">{feature.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
