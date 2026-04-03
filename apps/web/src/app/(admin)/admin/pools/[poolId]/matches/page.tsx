'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, RotateCcw } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { AdminMatch } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { StatePanel } from '@/components/ui/state-panel';

export default function PoolMatchesPage() {
  const params = useParams<{ poolId: string }>();
  const poolId = params?.poolId ?? '';
  const { token } = useAuth();
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [poolName, setPoolName] = useState('Pool');
  const [tournamentName, setTournamentName] = useState('Torneo');
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const title = useMemo(() => `${poolName} · ${tournamentName}`, [poolName, tournamentName]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.adminListPoolMatches(poolId, token);
        setMatches(data.matches);
        setPoolName(data.pool.name);
        setTournamentName(data.tournament.name);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar los matches del pool.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [poolId, token]);

  const recalculate = async () => {
    if (!token) {
      return;
    }
    setRecalculating(true);
    setError(null);
    setMessage(null);
    try {
      await api.adminRecalculatePoolScoring(poolId, token);
      setMessage('Scoring recalculado correctamente.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo recalcular scoring.');
    } finally {
      setRecalculating(false);
    }
  };

  if (loading) {
    return <StatePanel variant="loading" description="Cargando matches del pool..." />;
  }

  if (error && matches.length === 0) {
    return <StatePanel variant="error" description={error} />;
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link href="/admin/pools" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a pools
          </Link>
          <div className="inline-flex items-center gap-2">
            {!recalculating && <RotateCcw className="h-4 w-4 text-muted-foreground" />}
            <ConfirmActionButton
              size="sm"
              variant="outline"
              label={recalculating ? 'Recalculando...' : 'Recalcular scoring'}
              confirmLabel="Si, recalcular ahora"
              title="Confirmar recálculo de scoring"
              description="Esta accion vuelve a calcular todos los puntajes del pool con los resultados actuales."
              disabled={recalculating}
              onConfirm={recalculate}
            />
          </div>
        </div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {error && <StatePanel variant="error" description={error} compact />}
        {message && <StatePanel variant="success" description={message} compact />}
        {matches.length === 0 && <StatePanel variant="empty" description="No hay matches disponibles en este pool." />}

        {matches.map((match) => (
          <article key={match.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border/70 p-3 text-sm">
            <div>
              <p className="font-semibold">{match.homeTournamentTeam.team.name} vs {match.awayTournamentTeam.team.name}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(match.kickoffAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm font-bold">
                {match.homeScore ?? '-'} : {match.awayScore ?? '-'}
              </p>
              <Link href={`/admin/matches/${match.id}/questions`} className="text-xs font-semibold text-primary">
                Bonus questions
              </Link>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
