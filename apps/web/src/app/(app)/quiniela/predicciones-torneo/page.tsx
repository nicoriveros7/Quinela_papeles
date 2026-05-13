'use client';

import { useEffect, useState } from 'react';
import { Check, Goal, Lock, Medal, Search, Trophy } from 'lucide-react';

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

export default function PrediccionesTorneoPage() {
  const { token } = useAuth();
  const [data, setData] = useState<TournamentPredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const [championId, setChampionId] = useState('');
  const [runnerUpId, setRunnerUpId] = useState('');
  const [topScorerId, setTopScorerId] = useState('');

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
          setTopScorerId(res.prediction.topScorerTournamentPlayerId ?? '');
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
          topScorerTournamentPlayerId: topScorerId || null,
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

  const isLocked = data.prediction?.isLocked ?? false;
  const isDuplicate = Boolean(championId && runnerUpId && championId === runnerUpId);

  const championTeam = data.tournamentTeams.find((t) => t.id === championId);
  const runnerUpTeam = data.tournamentTeams.find((t) => t.id === runnerUpId);
  const topScorerPlayer = data.tournamentPlayers.find((p) => p.id === topScorerId);

  return (
    <div className="grid gap-5 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="rounded-2xl border border-border/70 bg-surface/90 p-4 shadow-card-sm">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Predicciones del torneo</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Predice el campeón, subcampeón y goleador antes de que empiece el Mundial.
        </p>
        {isLocked && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600">
            <Lock className="h-3 w-3" aria-hidden="true" />
            El torneo ya comenzó — predicciones bloqueadas
          </div>
        )}
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

      {/* ── Validation warning ───────────────────────────────────────────────── */}
      {isDuplicate && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300/50 bg-amber-50/60 px-4 py-3 text-sm font-semibold text-amber-800"
        >
          El campeón y subcampeón no pueden ser el mismo equipo.
        </div>
      )}

      {/* ── Goleador ─────────────────────────────────────────────────────────── */}
      <PlayerPicker
        label="Goleador del torneo"
        icon={Goal}
        players={data.tournamentPlayers}
        selectedId={topScorerId}
        onSelect={setTopScorerId}
        disabled={isLocked}
        selectedPlayer={topScorerPlayer}
      />

      {/* ── Save error ───────────────────────────────────────────────────────── */}
      {error && <StatePanel variant="error" description={error} compact />}

      {/* ── Save CTA ─────────────────────────────────────────────────────────── */}
      {!isLocked && (
        <div className="flex flex-wrap items-center gap-3 pb-2">
          <Button
            onClick={handleSave}
            disabled={saving || isDuplicate}
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
                  <span
                    className={cn(
                      'w-8 shrink-0 text-xs font-extrabold',
                      isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                    )}
                  >
                    {t.team.code}
                  </span>
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
            <Badge variant="success">
              <Check className="mr-1 h-2.5 w-2.5" aria-hidden="true" />
              {selectedPlayer.player.shortName ?? selectedPlayer.player.fullName}
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
                      {p.player.shortName && (
                        <span
                          className={cn(
                            'shrink-0 text-xs',
                            isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground',
                          )}
                        >
                          {p.player.shortName}
                        </span>
                      )}
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
