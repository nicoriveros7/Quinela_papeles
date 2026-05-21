'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { StatePanel } from '@/components/ui/state-panel';
import { useState } from 'react';

export default function PrediccionesPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const redirect = async () => {
      try {
        const data = await api.getMyMainPool(token);
        router.replace(`/pools/${data.pool.id}/entries/${data.mainEntry.id}`);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'No se pudo cargar la polla. Intenta recargar la página.',
        );
      }
    };

    void redirect();
  }, [token, router]);

  if (error) {
    return <StatePanel variant="error" description={error} />;
  }

  return <StatePanel variant="loading" description="Cargando predicciones..." />;
}
