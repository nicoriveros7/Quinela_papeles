'use client';

import { useEffect, useState } from 'react';
import { Award, Check, Goal, Lock, Medal, Search, ShieldCheck, Trophy } from 'lucide-react';

import { cn } from '@/lib/utils';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import {
  TournamentPlayerOption,
  TournamentPredictionResponse,
  TournamentTeamOption,
} from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SaveFeedback } from '@/components/ui/save-feedback';
import { StatePanel } from '@/components/ui/state-panel';
import { TeamLabel } from '@/components/ui/team-label';

function formatLockDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function PrediccionesTorneoPage() {
  const { token } = useAuth();
  const [data, setData] = useState<TournamentPredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [championId, setChampionId] = useState('');
  const [runnerUpId, setRunnerUpId] = useState('');
  const [thirdPlaceId, setThirdPlaceId] = useState('');
  const [topScorerId, setTopScorerId] = useState('');
  const [goldenBallId, setGoldenBallId] = useState('');
  const [goldenGloveId, setGoldenGloveId] = useState('');

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getMainTournamentPrediction(token);
        setData(res);
        if (res.prediction) {
          setChampionId(res.prediction.championTournamentTeamId ?? '');
          setRunnerUpId(res.prediction.runnerUpTournamentTeamId ?? '');
          setThirdPlaceId(res.prediction.thirdPlaceTournamentTeamId ?? '');
          setTopScorerId(res.prediction.topScorerTournamentPlayerId ?? '');
          setGoldenBallId(res.prediction.goldenBallTournamentPlayerId ?? '');
          setGoldenGloveId(res.prediction.goldenGloveTournamentPlayerId ?? '');
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las predicciones');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError(null);
    setSavedMsg(null);
    try {
      await api.upsertMainTournamentPrediction(
        {
          championTournamentTeamId: championId || null,
          runnerUpTournamentTeamId: runnerUpId || null,
          thirdPlaceTournamentTeamId: thirdPlaceId || null,
          topScorerTournamentPlayerId: topScorerId || null,
          goldenBallTournamentPlayerId: goldenBallId || null,
          goldenGloveTournamentPlayerId: goldenGloveId || null,
        },
        token,
      );
      setSavedMsg('Predicciones guardadas');
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar las predicciones');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <StatePanel variant="loading" description="Cargando predicciones del torneo..." />;
  if (error && !data) return <StatePanel variant="error" description={error} />;
  if (!data) return null;

  const isLocked = data.lockInfo.isLocked || (data.prediction?.isLocked ?? false);
  const lockAt = data.lockInfo.lockAt;

  const teamIds = [championId, runnerUpId, thirdPlaceId].filter(Boolean);
  const hasDuplicateTeams = new Set(teamIds).size !== teamIds.length;

  const championTeam = data.tournamentTeams.find((t) => t.id === championId);
  const runnerUpTeam = data.tournamentTeams.find((t) => t.id === runnerUpId);
  const thirdPlaceTeam = data.tournamentTeams.find((t) => t.id === thirdPlaceId);
  const topScorerPlayer = data.tournamentPlayers.find((p) => p.id === topScorerId);
  const goldenBallPlayer = data.tournamentPlayers.find((p) => p.id === goldenBallId);
  const goldenGlovePlayer = data.tournamentPlayers.find((p) => p.id === goldenGloveId);

  return (
    <div className="grid gap-5 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="rounded-2xl border border-border/70 bg-surface/90 p-4 shadow-card-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Predicciones del torneo</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Predice campeón, subcampeón, tercer puesto, bota de oro, balón de oro y guante de oro antes de que empiece el Mundial.
        </p>

        {isLocked ? (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Predicciones pre-torneo cerradas — ya no pueden modificarse
          </div>
        ) : lockAt ? (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Cierran el {formatLockDate(lockAt)}
          </div>
        ) : null}
      </header>

      {/* ── Campeón ──────────────────────────────────────────────────────────── */}
      <TeamPicker
        label="Campeón del torneo"
        icon={Trophy}
        teams={data.tournamentTeams}
        selectedId={championId}
        onSelect={setChampionId}
        disabled={isLocked}
        selectedTeam={championTeam}
      />

      {/* ── Subcampeón ───────────────────────────────────────────────────────── */}
      <TeamPicker
        label="Subcampeón del torneo"
        icon={Medal}
        teams={data.tournamentTeams}
        selectedId={runnerUpId}
        onSelect={setRunnerUpId}
        disabled={isLocked}
        selectedTeam={runnerUpTeam}
      />

      {/* ── Tercer puesto ────────────────────────────────────────────────────── */}
      <TeamPicker
        label="Tercer puesto"
        icon={Medal}
        teams={data.tournamentTeams}
        selectedId={thirdPlaceId}
        onSelect={setThirdPlaceId}
        disabled={isLocked}
        selectedTeam={thirdPlaceTeam}
      />

      {/* ── Validation warning ───────────────────────────────────────────────── */}
      {hasDuplicateTeams && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300/50 bg-amber-50/60 px-4 py-3 text-sm font-semibold text-amber-800"
        >
          Campeón, subcampeón y tercer puesto deben ser equipos distintos.
        </div>
      )}

      {/* ── Bota de Oro (Goleador) ───────────────────────────────────────────── */}
      <PlayerPicker
        label="Bota de Oro · Goleador del torneo"
        icon={Goal}
        players={data.tournamentPlayers}
        selectedId={topScorerId}
        onSelect={setTopScorerId}
        disabled={isLocked}
        selectedPlayer={topScorerPlayer}
      />

      {/* ── Balón de Oro ─────────────────────────────────────────────────────── */}
      <PlayerPicker
        label="Balón de Oro · Mejor jugador"
        icon={Award}
        players={data.tournamentPlayers}
        selectedId={goldenBallId}
        onSelect={setGoldenBallId}
        disabled={isLocked}
        selectedPlayer={goldenBallPlayer}
      />

      {/* ── Guante de Oro ────────────────────────────────────────────────────── */}
      <PlayerPicker
        label="Guante de Oro · Mejor portero"
        icon={ShieldCheck}
        players={data.tournamentPlayers}
        selectedId={goldenGloveId}
        onSelect={setGoldenGloveId}
        disabled={isLocked}
        selectedPlayer={goldenGlovePlayer}
      />

      {/* ── Save error ───────────────────────────────────────────────────────── */}
      {error && <StatePanel variant="error" description={error} compact />}

      {/* ── Save CTA ─────────────────────────────────────────────────────────── */}
      {!isLocked && (
        <div className="flex flex-wrap items-center gap-3 pb-2">
          <Button
            onClick={handleSave}
            disabled={saving || hasDuplicateTeams}
            className="gap-2"
          >
            {saving ? 'Guardando...' : 'Guardar predicciones'}
          </Button>
          <SaveFeedback saving={saving} message={savedMsg} />
        </div>
      )}
    </div>
  );
}

// ── TeamPicker ────────────────────────────────────────────────────────────────

function TeamPicker({
  label,
  icon: Icon,
  teams,
  selectedId,
  onSelect,
  disabled,
  selectedTeam,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  teams: TournamentTeamOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled: boolean;
  selectedTeam: TournamentTeamOption | undefined;
}) {
  const [search, setSearch] = useState('');

  const filtered = teams.filter((t) => {
    const q = search.toLowerCase();
    return t.team.name.toLowerCase().includes(q) || t.team.code.toLowerCase().includes(q);
  });

  return (
    <div className="rounded-2xl border border-border/70 bg-surface/90 p-4 shadow-card-sm">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="font-semibold text-foreground">{label}</h2>
        <div className="ml-auto shrink-0">
          {selectedTeam ? (
            <Badge variant="success">
              <Check className="mr-1 h-2.5 w-2.5" aria-hidden="true" />
              {selectedTeam.team.flagEmoji && (
                <span aria-hidden="true" className="mr-0.5">{selectedTeam.team.flagEmoji}</span>
              )}
              {selectedTeam.team.code} — {selectedTeam.team.name}
            </Badge>
          ) : (
            <Badge variant="muted">Sin seleccionar</Badge>
          )}
        </div>
      </div>

      {/* Search */}
      {!disabled && (
        <div className="relative mb-2">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder="Buscar selección..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border/60 bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
          />
        </div>
      )}

      {/* List */}
      <div className="scrollbar-sport max-h-56 overflow-y-auto rounded-xl border border-border/40 bg-background/60">
        {filtered.length === 0 ? (
          <p className="px-3 py-3 text-center text-xs text-muted-foreground">Sin resultados.</p>
        ) : (
          <div className="p-1">
            {filtered.map((t) => {
              const isSelected = t.id === selectedId;
              return (
                <button
                  key={t.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={disabled}
                  onClick={() => onSelect(isSelected ? '' : t.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left',
                    'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-card-sm'
                      : 'text-foreground hover:bg-muted',
                    disabled && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <TeamLabel
                    name={t.team.name}
                    code={t.team.code}
                    flagEmoji={t.team.flagEmoji}
                    format="compact"
                    className={cn(
                      'shrink-0 text-xs font-extrabold',
                      isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                    )}
                  />
                  <span className="flex-1 truncate text-sm font-medium">{t.team.name}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getFlagEmoji(nationalityCode: string | null | undefined): string | null {
  if (!nationalityCode || nationalityCode.length !== 2) return null;
  const [first, second] = nationalityCode.toUpperCase();
  const base = 0x1f1e6;
  return String.fromCodePoint(
    base + (first.charCodeAt(0) - 65),
    base + (second.charCodeAt(0) - 65),
  );
}

// ── PlayerPicker ──────────────────────────────────────────────────────────────

function PlayerPicker({
  label,
  icon: Icon,
  players,
  selectedId,
  onSelect,
  disabled,
  selectedPlayer,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  players: TournamentPlayerOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled: boolean;
  selectedPlayer: TournamentPlayerOption | undefined;
}) {
  const [search, setSearch] = useState('');

  const filtered = players.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.player.fullName.toLowerCase().includes(q) ||
      (p.player.shortName?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="rounded-2xl border border-border/70 bg-surface/90 p-4 shadow-card-sm">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Icon className="h-4 w-4" />
        </span>
        <h2 className="font-semibold text-foreground">{label}</h2>
        <div className="ml-auto shrink-0">
          {selectedPlayer ? (
            <Badge variant="success" className="gap-2 normal-case tracking-normal">
              <Check className="mr-1 h-2.5 w-2.5" aria-hidden="true" />
              <span className="truncate">{selectedPlayer.player.fullName}</span>
              {(selectedPlayer.player.nationalityCode || getFlagEmoji(selectedPlayer.player.nationalityCode)) && (
                <span className="inline-flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-emerald-700/80">
                  {getFlagEmoji(selectedPlayer.player.nationalityCode) && (
                    <span className="text-base leading-none">
                      {getFlagEmoji(selectedPlayer.player.nationalityCode)}
                    </span>
                  )}
                  {selectedPlayer.player.nationalityCode}
                </span>
              )}
            </Badge>
          ) : (
            <Badge variant="muted">Sin seleccionar</Badge>
          )}
        </div>
      </div>

      {/* Empty state when no players loaded */}
      {players.length === 0 ? (
        <StatePanel
          variant="empty"
          description="Los jugadores estarán disponibles cuando se publique el plantel."
          compact
        />
      ) : (
        <>
          {/* Search */}
          {!disabled && (
            <div className="relative mb-2">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Buscar jugador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-border/60 bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
              />
            </div>
          )}

          {/* List */}
          <div className="scrollbar-sport max-h-56 overflow-y-auto rounded-xl border border-border/40 bg-background/60">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-muted-foreground">Sin resultados.</p>
            ) : (
              <div className="p-1">
                {filtered.map((p) => {
                  const isSelected = p.id === selectedId;
                  const countryCode = (p.player.nationalityCode ?? '—').toUpperCase();
                  const flagEmoji = getFlagEmoji(p.player.nationalityCode);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={disabled}
                      onClick={() => onSelect(isSelected ? '' : p.id)}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left',
                        'transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-card-sm'
                          : 'text-foreground hover:bg-muted',
                        disabled && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      <span className="flex-1 truncate text-sm font-medium">{p.player.fullName}</span>
                      <span
                        className={cn(
                          'inline-flex shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em]',
                          isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                        )}
                      >
                        {flagEmoji && <span className="text-base leading-none">{flagEmoji}</span>}
                        {countryCode}
                      </span>
                      {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
