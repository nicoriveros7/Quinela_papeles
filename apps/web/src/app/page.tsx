import Link from 'next/link';
import { ArrowRight, Award, BarChart2, CheckCircle, Shield, Star, Target, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Target,
    title: 'Predice los 104 partidos',
    description: 'Marca resultado exacto o ganador para todos los encuentros, desde la fase de grupos hasta la final.',
  },
  {
    icon: Trophy,
    title: 'Elige al campeón',
    description: 'Predice quién levanta la copa, el subcampeón y el máximo goleador del torneo.',
  },
  {
    icon: Star,
    title: 'Preguntas bonus',
    description: 'Responde preguntas especiales que valen puntos extra y agregan más emoción a cada jornada.',
  },
  {
    icon: BarChart2,
    title: 'Ranking en vivo',
    description: 'Sube posiciones con cada resultado. Compara tu puntaje con todos los participantes.',
  },
];

const pointsSystem = [
  { label: 'Resultado exacto', value: '3 pts' },
  { label: 'Ganador correcto', value: '1 pt' },
  { label: 'Campeón acertado', value: '10 pts' },
  { label: 'Subcampeón acertado', value: '6 pts' },
  { label: 'Goleador acertado', value: '5 pts' },
];

export default function HomePage() {
  return (
    <main className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-stadium" />

      <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="mb-10 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-primary">
            <Shield className="h-3.5 w-3.5" />
            La Polla Mundialista 2026
          </span>
          <Link
            href="/login"
            className="text-xs font-semibold uppercase tracking-[0.12em] text-primary hover:underline focus-visible:underline"
          >
            Entrar
          </Link>
        </header>

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="mb-4 animate-slide-up rounded-3xl border border-white/20 bg-surface/90 p-6 shadow-card backdrop-blur sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:gap-10">
            {/* Left: headline + CTA */}
            <div className="flex flex-col gap-5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-accent-foreground">
                <Award className="h-3.5 w-3.5 text-accent" />
                Mundial FIFA 2026
              </div>

              <h1 className="text-3xl font-extrabold leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                La polla del<br />
                <span className="text-primary">Mundial 2026</span>
              </h1>

              <p className="max-w-lg text-base leading-relaxed text-muted-foreground">
                Predice resultados, elige al campeón y compite en el ranking.
                Sin complicaciones: regístrate y quedas inscrito automáticamente.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link href="/register">
                  <Button size="lg" className="gap-2 shadow-card-sm">
                    Crear cuenta gratis
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="outline" size="lg">
                    Ya tengo cuenta
                  </Button>
                </Link>
              </div>

              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5 shrink-0 text-primary" />
                Al registrarte entras directo a la polla. Sin crear grupos ni pedir códigos.
              </p>
            </div>

            {/* Right: points system */}
            <div className="flex flex-col justify-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Sistema de puntos
              </p>
              <div className="divide-y divide-border/50 rounded-2xl border border-border/60 bg-white/70 shadow-inner-subtle">
                {pointsSystem.map((item) => (
                  <div key={item.label} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-foreground/80">{item.label}</span>
                    <span className="text-sm font-bold text-primary">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ───────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="animate-slide-up rounded-2xl border border-white/20 bg-surface/85 p-5 shadow-card-sm backdrop-blur"
                style={{ animationDelay: `${60 + i * 40}ms` }}
              >
                <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-2.5 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <h2 className="mb-1.5 text-sm font-bold leading-snug text-foreground">
                  {feature.title}
                </h2>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </section>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <footer className="mt-auto pt-10 text-center text-xs text-muted-foreground/50">
          La Polla Mundialista 2026
        </footer>
      </div>
    </main>
  );
}
