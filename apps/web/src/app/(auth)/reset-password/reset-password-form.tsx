'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (!token) {
      setError('El enlace de recuperación no es válido.');
      return;
    }

    setLoading(true);

    try {
      await api.resetPassword(token, newPassword);
      setDone(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo actualizar la contraseña. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md animate-scale-in px-1">
      {/* Brand + heading */}
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
          <Shield className="h-3.5 w-3.5" />
          La Polla Mundialista 2026
        </span>

        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Nueva contraseña
        </h1>

        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          Elige una contraseña segura para tu cuenta.
        </p>
      </div>

      {/* Card */}
      <div className="rounded-3xl border border-white/25 bg-surface/92 p-6 shadow-card backdrop-blur sm:p-7">
        {done ? (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <p className="text-sm leading-relaxed text-foreground">
              Tu contraseña fue actualizada correctamente. Ya puedes iniciar sesión con tu nueva
              contraseña.
            </p>
            <Link
              href="/login"
              className="mt-1 inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Ir al inicio de sesión
            </Link>
          </div>
        ) : (
          <form className="grid gap-4" onSubmit={onSubmit} noValidate>
            {!token && (
              <div
                role="alert"
                className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm font-medium text-rose-300"
              >
                El enlace de recuperación no es válido. Solicita uno nuevo.
              </div>
            )}

            <div className="grid gap-1.5">
              <label htmlFor="newPassword" className="text-sm font-medium text-foreground">
                Nueva contraseña
              </label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pr-10"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
                Confirmar contraseña
              </label>
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
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

            <Button type="submit" disabled={loading || !token} className="mt-1 gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                'Actualizar contraseña'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="hover:underline focus-visible:underline">
                Volver al inicio de sesión
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
