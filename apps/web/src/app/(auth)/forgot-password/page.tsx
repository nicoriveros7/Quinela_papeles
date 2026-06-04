'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Shield } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo completar la operación. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Layer 1 — FIFA artwork texture (lowest) */}
      <div
        aria-hidden="true"
        className="absolute -inset-2 -z-20 bg-cover bg-center opacity-[0.16] blur-[4px] pointer-events-none"
        style={{ backgroundImage: "url('/backgrounds/fifa-2026-dark-portrait.jpeg')" }}
      />
      {/* Layer 2 — stadium gradient overlay */}
      <div className="absolute inset-0 -z-10 bg-stadium opacity-[0.85]" />

      <div className="relative z-10 w-full max-w-md animate-scale-in px-1">
        {/* Brand + heading */}
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
            <Shield className="h-3.5 w-3.5" />
            La Polla Mundialista 2026
          </span>

          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Recupera tu contraseña
          </h1>

          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Ingresa tu correo y te enviaremos instrucciones para restablecer tu contraseña.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-white/25 bg-surface/92 p-6 shadow-card backdrop-blur sm:p-7">
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-2 text-center">
              <p className="text-sm leading-relaxed text-foreground">
                Si el correo existe, te enviaremos instrucciones para restablecer tu contraseña.
                Revisa tu bandeja de entrada y la carpeta de spam.
              </p>
              <Link
                href="/login"
                className="mt-1 text-sm font-semibold text-primary hover:underline focus-visible:underline"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          ) : (
            <form className="grid gap-4" onSubmit={onSubmit} noValidate>
              <div className="grid gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Correo electrónico
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300"
                >
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="mt-1 gap-2">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar instrucciones'
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                <Link
                  href="/login"
                  className="hover:underline focus-visible:underline"
                >
                  Volver al inicio de sesión
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
