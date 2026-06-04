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

export default function HomePage() {
  return (
    <main className="relative isolate min-h-dvh overflow-hidden bg-background text-foreground">
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
        <section className="relative overflow-hidden mb-6 animate-slide-up rounded-3xl border border-white/[0.09] bg-surface p-6 shadow-card shadow-inner-subtle backdrop-blur sm:p-8 lg:p-10">
          {/* FIFA artwork texture — rendered above bg-surface, below content (DOM order) */}
          <div
            aria-hidden="true"
            className="absolute -inset-2 bg-cover bg-center opacity-[0.09] blur-[4px] pointer-events-none"
            style={{ backgroundImage: "url('/backgrounds/fifa-dark-organic-landscape.jpeg')" }}
          />
          <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:gap-10">
            {/* Left: headline + CTA */}
            <div className="flex flex-col gap-5">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
                <Award className="h-3.5 w-3.5 text-primary" />
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
            <div className="flex flex-col justify-center gap-4">
              <div className="rounded-2xl border border-white/[0.08] bg-background/60 p-4 shadow-inner-subtle">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Sistema de puntos
                </p>

                <div className="grid gap-5">
                  {/* Bloque 1 — Partidos */}
                  <div>
                    <h3 className="mb-1 text-xs font-bold text-primary">Partidos</h3>
                    <p className="mb-2.5 text-[10px] leading-relaxed text-muted-foreground">
                      Cada partido suma por aciertos parciales. Mientras más cerca estés, más puntos ganas.
                    </p>
                    <div className="grid gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground/70">Marcador exacto</span>
                        <span className="font-bold text-primary">+5 pts</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground/80">
                        <span>Dif. goles / Ganador</span>
                        <span className="font-semibold">+1 pt</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-muted-foreground/80">
                        <span>Goles local / visita / total</span>
                        <span className="font-semibold">+1 pt c/u</span>
                      </div>
                    </div>
                  </div>

                  {/* Bloque 2 — Pre-torneo */}
                  <div>
                    <h3 className="mb-1 text-xs font-bold text-primary">Pre-torneo</h3>
                    <div className="grid gap-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground/70">Equipos acertados</span>
                        <span className="font-bold text-primary">+15 pts</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 leading-tight">
                        Campeón, subcampeón y tercer puesto.
                      </p>
                      <div className="flex justify-between text-xs">
                        <span className="text-foreground/70">Jugadores acertados</span>
                        <span className="font-bold text-primary">+10 pts</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground/60 leading-tight">
                        Goleador, MVP y mejor arquero.
                      </p>
                    </div>
                  </div>

                  {/* Bloque 3 — Bonus */}
                  <div className="pt-2 border-t border-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-primary">Preguntas Bonus</h3>
                      <span className="text-[11px] font-bold text-primary">Variable</span>
                    </div>
                    <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                      Algunos partidos tienen preguntas especiales con puntos extra.
                    </p>
                  </div>
                </div>
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
                className="animate-slide-up rounded-2xl border border-white/[0.09] bg-surface p-5 shadow-card-sm shadow-inner-subtle backdrop-blur"
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
