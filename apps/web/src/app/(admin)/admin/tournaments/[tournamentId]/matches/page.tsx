'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { AdminMatch } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { Input } from '@/components/ui/input';
import { StatePanel } from '@/components/ui/state-panel';

type ScoreDraft = {
  homeScore: string;
  awayScore: string;
};

const groupLabels = {
  NO_GROUP: 'Eliminatorias',
} as const;

function getSideLabel(match: AdminMatch, side: 'home' | 'away') {
  if (side === 'home') {
    return match.homeTournamentTeam?.team.name ?? match.homeSlotLabel ?? 'TBD';
  }
  return match.awayTournamentTeam?.team.name ?? match.awaySlotLabel ?? 'TBD';
}

function getStatusVariant(status: AdminMatch['status']) {
  if (status === 'FINISHED') return 'success';
  if (status === 'LIVE') return 'warning';
  if (status === 'CANCELLED') return 'danger';
  if (status === 'POSTPONED') return 'warning';
  return 'muted';
}

function getRoundLabel(match: AdminMatch) {
  return match.roundLabel ?? match.stage ?? 'Sin round';
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
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');

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
          data.matches.map((match) => [
            match.id,
            {
              homeScore: match.homeScore === null ? '' : String(match.homeScore),
              awayScore: match.awayScore === null ? '' : String(match.awayScore),
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

  const groupOptions = useMemo(() => {
    const groups = new Set<string>();
    matches.forEach((match) => {
      if (match.group?.code) {
        groups.add(match.group.code);
      }
    });
    return Array.from(groups).sort();
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const sorted = [...matches].sort((a, b) =>
      new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime(),
    );

    const queryTokens = search
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    return sorted.filter((match) => {
      if (groupFilter !== 'ALL') {
        if (groupFilter === groupLabels.NO_GROUP) {
          if (match.group?.code) {
            return false;
          }
        } else if (match.group?.code !== groupFilter) {
          return false;
        }
      }

      if (queryTokens.length === 0) {
        return true;
      }

      const tokens = [
        match.matchNumber ? `#${match.matchNumber}` : null,
        match.matchNumber ? String(match.matchNumber) : null,
        match.roundLabel,
        match.stage,
        match.group?.code ? `Grupo ${match.group.code}` : null,
        match.homeTournamentTeam?.team.name,
        match.homeTournamentTeam?.team.code,
        match.awayTournamentTeam?.team.name,
        match.awayTournamentTeam?.team.code,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return queryTokens.every((token) => tokens.includes(token));
    });
  }, [groupFilter, matches, search]);

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
      setError('Los scores deben ser numericos.');
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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Matches de {tournamentName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {filteredMatches.length} de {matches.length} matches
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="muted">Buscar por equipo, grupo o #</Badge>
          </div>
        </div>
        <div className="grid gap-3 rounded-2xl border border-border/70 bg-gradient-to-br from-white via-white to-emerald-50/70 p-4">
          <div className="grid gap-3 lg:grid-cols-[2fr_1fr] lg:items-end">
            <div className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Buscar</p>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Ej: MEX, Grupo A, Matchday 1, #12"
              />
            </div>
            <div className="grid gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Grupo</p>
              <select
                className="h-11 w-full rounded-md border border-input bg-white/90 px-3 text-sm text-foreground shadow-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/25"
                value={groupFilter}
                onChange={(event) => setGroupFilter(event.target.value)}
              >
                <option value="ALL">Todos los grupos</option>
                {groupOptions.map((group) => (
                  <option key={group} value={group}>
                    Grupo {group}
                  </option>
                ))}
                <option value={groupLabels.NO_GROUP}>{groupLabels.NO_GROUP}</option>
              </select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {error && <StatePanel variant="error" description={error} compact />}
        {success && <StatePanel variant="success" description={success} compact />}
        {matches.length === 0 && <StatePanel variant="empty" description="Este torneo no tiene matches configurados." />}
        {matches.length > 0 && filteredMatches.length === 0 && (
          <StatePanel variant="empty" description="No hay matches con esos filtros." />
        )}
        {filteredMatches.map((match) => (
          <article key={match.id} className="grid gap-2 rounded-xl border border-border/70 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">{getSideLabel(match, 'home')} vs {getSideLabel(match, 'away')}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(match.kickoffAt)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={getStatusVariant(match.status)} className="text-[11px]">
                {match.status}
              </Badge>
              <Badge variant="muted" className="text-[11px]">
                {getRoundLabel(match)}
              </Badge>
              {match.matchNumber !== null && (
                <Badge variant="muted" className="text-[11px]">#{match.matchNumber}</Badge>
              )}
              {match.group?.code && (
                <Badge variant="muted" className="text-[11px]">Grupo {match.group.code}</Badge>
              )}
              {match._count.questions > 0 && (
                <Badge variant="default" className="text-[11px]">{match._count.questions} bonus</Badge>
              )}
            </div>
            <div className="grid gap-2 lg:grid-cols-[1fr_auto_1fr_auto] lg:items-center">
              <Input
                type="number"
                min={0}
                value={drafts[match.id]?.homeScore ?? ''}
                onChange={(event) => updateDraft(match.id, 'homeScore', event.target.value)}
                placeholder="Home"
                className="h-9"
              />
              <span className="text-center text-sm font-semibold text-muted-foreground">-</span>
              <Input
                type="number"
                min={0}
                value={drafts[match.id]?.awayScore ?? ''}
                onChange={(event) => updateDraft(match.id, 'awayScore', event.target.value)}
                placeholder="Away"
                className="h-9"
              />
              <ConfirmActionButton
                size="sm"
                disabled={savingId === match.id}
                label={savingId === match.id ? 'Guardando...' : 'Guardar'}
                confirmLabel="Si, marcar FINISHED"
                title="Confirmar cierre del match"
                description={`Se guardara ${drafts[match.id]?.homeScore || '-'}-${drafts[match.id]?.awayScore || '-'} y el estado pasara a FINISHED.`}
                onConfirm={() => saveResult(match.id)}
                buttonClassName="w-full lg:w-auto"
                panelClassName="w-full sm:max-w-[360px]"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <Link href={`/admin/matches/${match.id}/questions`} className="font-semibold text-primary">
                Gestionar bonus questions
              </Link>
              <span className="text-[11px] text-muted-foreground">Actualiza el score y guarda.</span>
            </div>
          </article>
        ))}
      </CardContent>
    </Card>
  );
}