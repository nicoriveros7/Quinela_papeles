'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/providers/auth-provider';
import { StatePanel } from '@/components/ui/state-panel';

export default function PrediccionesPage() {
  const { mainPool, mainPoolLoading, mainPoolError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!mainPool) return;
    router.replace(`/pools/${mainPool.pool.id}/entries/${mainPool.mainEntry.id}`);
  }, [mainPool, router]);

  if (mainPoolError) {
    return <StatePanel variant="error" description={mainPoolError} />;
  }

  return <StatePanel variant="loading" description="Cargando predicciones..." />;
}
