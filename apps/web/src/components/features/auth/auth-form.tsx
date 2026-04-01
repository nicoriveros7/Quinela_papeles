'use client';

import { useState } from 'react';
import Link from 'next/link';

import { ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type AuthFormMode = 'login' | 'register';

export function AuthForm({ mode }: { mode: AuthFormMode }) {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
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
        await login(email.trim(), password);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('No se pudo completar la operacion. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md border-white/20 bg-surface/90">
      <CardHeader>
        <CardTitle>{isRegister ? 'Crear cuenta' : 'Iniciar sesion'}</CardTitle>
        <CardDescription>
          {isRegister
            ? 'Crea tu usuario y empieza a competir en tus pools.'
            : 'Bienvenido de vuelta. Entra para ver tus predicciones.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3" onSubmit={onSubmit}>
          {isRegister ? (
            <Input
              placeholder="Nombre visible"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
              maxLength={80}
            />
          ) : null}

          <Input
            type="email"
            placeholder="email@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            type="password"
            placeholder="********"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />

          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}

          <Button type="submit" disabled={loading}>
            {loading ? 'Procesando...' : isRegister ? 'Registrarme' : 'Entrar'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {isRegister ? 'Ya tienes cuenta?' : 'No tienes cuenta?'}{' '}
            <Link href={isRegister ? '/login' : '/register'} className="font-semibold text-primary hover:underline">
              {isRegister ? 'Inicia sesion' : 'Registrate'}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
