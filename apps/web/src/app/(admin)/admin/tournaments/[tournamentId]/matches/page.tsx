'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { AdminMatch } from '@/types/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { Input } from '@/components/ui/input';
import { StatePanel } from '@/components/ui/state-panel';

type ScoreDraft = {
  homeScore: string;
  awayScore: string;
};

function getSideLabel(match: AdminMatch, side: 'home' | 'away') {
  if (side === 'home') {
    return match.homeTournamentTeam?.team.name ?? match.homeSlotLabel ?? 'TBD';
  }
  return match.awayTournamentTeam?.team.name ?? match.awaySlotLabel ?? 'TBD';
}

export default function TournamentMatchesPage() {
  const params = useParams<{ tournamentId: string }>();
  const tournamentId = params?.tournamentId ?? '';
  const { token } = useAuth();
  const [matches, setMatches] = useState<AdminMatch[]>([]);
  const [tournamentName, setTournamentName] = useState('Torneo');
  const [drafts, setDrafts] = useState<Record<string, ScoreDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadMatches = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.adminListTournamentMatches(tournamentId, token);
      setTournamentName(data.tournament.name);
      setMatches(data.matches);
      setDrafts(
        Object.fromEntries(
          data.matches.map((m) => [
            m.id,
            {
              homeScore: m.homeScore === null ? '' : String(m.homeScore),
              awayScore: m.awayScore === null ? '' : String(m.awayScore),
            },
          ]),
        ),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo cargar los matches del torneo.');
    } finally {
      setLoading(false);
    }
  }, [token, tournamentId]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const updateDraft = (matchId: string, field: keyof ScoreDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value,
      },
    }));
  };

  const saveResult = async (matchId: string) => {
    if (!token) {
      return;
    }
    const draft = drafts[matchId];
    if (!draft || draft.homeScore === '' || draft.awayScore === '') {
      setError('Debes completar ambos scores para guardar.');
      return;
    }

    const homeScore = Number(draft.homeScore);
    const awayScore = Number(draft.awayScore);
    if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
      setError('Los scores deben ser numéricos.');
      return;
    }

    setSavingId(matchId);
    setError(null);
    setSuccess(null);
    try {
      await api.adminUpdateMatchResult(matchId, { homeScore, awayScore, status: 'FINISHED' }, token);
      await loadMatches();
      setSuccess('Match marcado como FINISHED y resultado guardado.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar el resultado.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return <StatePanel variant="loading" description="Cargando matches del torneo..." />;
  }

  if (error && matches.length === 0) {
    return <StatePanel variant="error" description={error} />;
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <Link href="/admin/tournaments" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
          <ArrowLeft className="h-3.5 w-3.5" />
          Volver a torneos
        </Link>
        <CardTitle>Matches de {tournamentName}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        {error && <StatePanel variant="error" description={error} compact />}
        {success && <StatePanel variant="success" description={success} compact />}
        {matches.length === 0 && <StatePanel variant="empty" description="Este torneo no tiene matches configurados." />}
        {matches.map((match) => (
          <article key={match.id} className="grid gap-3 rounded-2xl border border-border/70 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold">{getSideLabel(match, 'home')} vs {getSideLabel(match, 'away')}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(match.kickoffAt)}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
              <Input
                type="number"
                min={0}
                value={drafts[match.id]?.homeScore ?? ''}
                onChange={(event) => updateDraft(match.id, 'homeScore', event.target.value)}
                placeholder="Home"
              />
              <span className="text-center text-sm font-semibold text-muted-foreground">-</span>
              <Input
                type="number"
                min={0}
                value={drafts[match.id]?.awayScore ?? ''}
                onChange={(event) => updateDraft(match.id, 'awayScore', event.target.value)}
                placeholder="Away"
              />
              <ConfirmActionButton
                size="sm"
                disabled={savingId === match.id}
                label={savingId === match.id ? 'Guardando...' : 'Guardar'}
                confirmLabel="Si, marcar FINISHED"
                title="Confirmar cierre del match"
                description={`Se guardara ${drafts[match.id]?.homeScore || '-'}:${drafts[match.id]?.awayScore || '-'} y el estado pasara a FINISHED.`}
                onConfirm={() => saveResult(match.id)}
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href={`/admin/matches/${match.id}/questions`} className="font-semibold text-primary">
                Gestionar bonus questions
              </Link>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}
