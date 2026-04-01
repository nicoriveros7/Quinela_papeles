'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function JoinPoolPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onJoin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await api.joinPool(joinCode.trim().toUpperCase(), token);
      setSuccess('Te uniste correctamente al pool.');
      setTimeout(() => router.push('/pools'), 700);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo completar la operacion.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Unirme a una Pool</CardTitle>
          <CardDescription>Ingresa el codigo compartido por el owner del pool.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={onJoin}>
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              minLength={4}
              maxLength={16}
              placeholder="Ej: ABCD1234"
              required
            />
            {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
            {success ? <p className="text-sm font-medium text-emerald-700">{success}</p> : null}
            <Button type="submit" disabled={loading}>
              {loading ? 'Uniendo...' : 'Unirme'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
