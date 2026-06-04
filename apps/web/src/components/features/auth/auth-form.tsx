'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';

import { ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type AuthFormMode = 'login' | 'register';

export function AuthForm({ mode }: { mode: AuthFormMode }) {
  const { login, register } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        await register(email.trim(), displayName.trim(), password);
      } else {
        await login(identifier.trim(), password);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.message.toLowerCase();
        if (msg.includes('invalid credentials') || msg.includes('unauthorized')) {
          setError('Credenciales incorrectas. Intenta de nuevo.');
        } else if (msg.includes('email is already in use') || msg.includes('conflict')) {
          setError('Este correo ya está registrado. Intenta iniciar sesión.');
        } else {
          setError(err.message);
        }
      } else {
        setError('No se pudo completar la operación. Intenta nuevamente.');
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
          {isRegister ? 'Crea tu cuenta' : 'Entra a la Polla'}
        </h1>

        <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
          {isRegister
            ? 'Al registrarte quedas inscrito automáticamente a la Polla Mundial 2026. Sin crear ni unirte a ningún grupo.'
            : 'Bienvenido de vuelta. Entra para ver tus predicciones y el ranking.'}
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-3xl border border-white/25 bg-surface/92 p-6 shadow-card backdrop-blur sm:p-7">
        <form className="grid gap-4" onSubmit={onSubmit} noValidate>
          {isRegister && (
            <div className="grid gap-1.5">
              <label htmlFor="displayName" className="text-sm font-medium text-foreground">
                Nombre visible
              </label>
              <Input
                id="displayName"
                placeholder="Como quieres que te conozcan"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                minLength={2}
                maxLength={80}
                autoComplete="name"
              />
            </div>
          )}

          {isRegister ? (
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
          ) : (
            <div className="grid gap-1.5">
              <label htmlFor="identifier" className="text-sm font-medium text-foreground">
                Email o usuario
              </label>
              <Input
                id="identifier"
                type="text"
                placeholder="tu@email.com o tu_usuario"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
          )}

          <div className="grid gap-1.5">
            <label
              htmlFor="password"
              className="text-sm font-medium text-foreground"
            >
              Contraseña
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="pr-10"
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
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
                Procesando...
              </>
            ) : isRegister ? (
              'Crear cuenta y entrar a la polla'
            ) : (
              'Entrar'
            )}
          </Button>

          {!isRegister && (
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/forgot-password"
                className="hover:underline focus-visible:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'}{' '}
            <Link
              href={isRegister ? '/login' : '/register'}
              className="font-semibold text-primary hover:underline focus-visible:underline"
            >
              {isRegister ? 'Inicia sesión' : 'Regístrate gratis'}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
