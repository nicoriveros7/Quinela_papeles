'use client';

import { useEffect, useRef, useState } from 'react';
import { Award, Check, ChevronDown, Goal, Lock, Medal, Search, ShieldCheck, Trophy, Users } from 'lucide-react';

import { cn, normalizeSearchText } from '@/lib/utils';
import { getPlayerDisplayName, matchesPlayerSearch } from '@/lib/player-utils';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import {
  TournamentFieldScore,
  TournamentPlayerOption,
  TournamentPredictionResponse,
  TournamentTeamOption,
} from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SaveFeedback } from '@/components/ui/save-feedback';
import { StatePanel } from '@/components/ui/state-panel';
import { TeamLabel } from '@/components/ui/team-label';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatLockDate(isoString: string): string {
  return new Date(isoString).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

function getFlagEmoji(code: string | null | undefined): string | null {
  if (!code || code.length !== 2) return null;
  const [a, b] = code.toUpperCase();
  const base = 0x1f1e6;
  return String.fromCodePoint(base + (a.charCodeAt(0) - 65), base + (b.charCodeAt(0) - 65));
}

function isPlaceholderPlayer(name: string): boolean {
  return /^player\s*\d*$/i.test(name.trim()) || /^tbd$/i.test(name.trim());
}

// ── FieldScoreBadge ───────────────────────────────────────────────────────────

function FieldScoreBadge({ score }: { score: TournamentFieldScore | null | undefined }) {
  if (!score || score.isCorrect === null) return null;
  if (score.isCorrect) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
        ✓ +{score.points}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-400/80">
      ✗ 0
    </span>
  );
}

function BestThirdsScoreBadge({ score }: { score: (TournamentFieldScore & { hits: number; total: number }) | null | undefined }) {
  if (!score || score.isCorrect === null) return null;
  const hitsLabel = score.total > 0 ? ` · ${score.hits}/${score.total}` : '';
  if (score.isCorrect) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
        ✓ +{score.points}{hitsLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[11px] font-bold text-rose-400/80">
      ✗ 0{hitsLabel}
    </span>
  );
}

// ── Section key type ──────────────────────────────────────────────────────────

const BEST_THIRDS_REQUIRED = 8;

type SectionKey = 'champion' | 'runnerUp' | 'thirdPlace' | 'topScorer' | 'goldenBall' | 'goldenGlove' | 'bestThirds';

// ── Page ─────────────────────────────────────────────────────────────────────

export default function PrediccionesTorneoPage() {
  const { token } = useAuth();
  const [data, setData] = useState<TournamentPredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<SectionKey | null>(null);

  const [championId, setChampionId] = useState('');
  const [runnerUpId, setRunnerUpId] = useState('');
  const [thirdPlaceId, setThirdPlaceId] = useState('');
  const [topScorerId, setTopScorerId] = useState('');
  const [goldenBallId, setGoldenBallId] = useState('');
  const [goldenGloveId, setGoldenGloveId] = useState('');
  const [bestThirdsIds, setBestThirdsIds] = useState<string[]>([]);

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
          setBestThirdsIds(res.prediction.bestThirdsTeamIds ?? []);
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
          championTournamentTeamId:   championId || null,
          runnerUpTournamentTeamId:   runnerUpId || null,
          thirdPlaceTournamentTeamId: thirdPlaceId || null,
          topScorerTournamentPlayerId: topScorerId || null,
          goldenBallTournamentPlayerId: goldenBallId || null,
          goldenGloveTournamentPlayerId: goldenGloveId || null,
          bestThirdsTeamIds: bestThirdsIds.length > 0 ? bestThirdsIds : null,
        },
        token,
      );
      setSavedMsg('Predicciones guardadas');
      setOpenSection(null);
      setTimeout(() => setSavedMsg(null), 3000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error al guardar las predicciones');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (section: SectionKey) =>
    setOpenSection((prev) => (prev === section ? null : section));

  if (loading) return <StatePanel variant="loading" description="Cargando predicciones del torneo..." />;
  if (error && !data) return <StatePanel variant="error" description={error} />;
  if (!data) return null;

  const isLocked = data.lockInfo.isLocked || (data.prediction?.isLocked ?? false);
  const lockAt = data.lockInfo.lockAt;
  const showFieldScores = isLocked && (data.prediction?.isScored ?? false);
  const fb = showFieldScores ? data.prediction?.fieldBreakdown : null;

  const teamIds = [championId, runnerUpId, thirdPlaceId].filter(Boolean);
  const hasDuplicateTeams = new Set(teamIds).size !== teamIds.length;

  const championTeam = data.tournamentTeams.find((t) => t.id === championId);
  const runnerUpTeam = data.tournamentTeams.find((t) => t.id === runnerUpId);
  const thirdPlaceTeam = data.tournamentTeams.find((t) => t.id === thirdPlaceId);
  const topScorerPlayer = data.tournamentPlayers.find((p) => p.id === topScorerId);
  const goldenBallPlayer = data.tournamentPlayers.find((p) => p.id === goldenBallId);
  const goldenGlovePlayer = data.tournamentPlayers.find((p) => p.id === goldenGloveId);

  const realPlayers = data.tournamentPlayers.filter(
    (p) => !isPlaceholderPlayer(p.player.fullName),
  );
  const hasRealPlayers = realPlayers.length > 0;
  const realGoalkeepers = realPlayers.filter((p) => p.isGoalkeeper);

  return (
    <div className="grid gap-3 animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-surface p-4 shadow-card-sm shadow-inner-subtle">
        {/* Subtle premium glow */}
        <div
          aria-hidden="true"
          className="absolute right-0 top-0 -z-10 h-full w-full opacity-40 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at top right, hsl(var(--primary) / 0.08), transparent 45%)',
          }}
        />
        <h1 className="truncate text-2xl font-extrabold tracking-tight text-foreground">
          Predicciones del torneo
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Predice el campeón, subcampeón, tercer puesto y premios individuales antes del Mundial.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="success" className="bg-primary/10 text-primary border-primary/20">
            Equipos: 15 pts c/u
          </Badge>
          <Badge variant="success" className="bg-primary/10 text-primary border-primary/20">
            Jugadores: 10 pts c/u
          </Badge>
          <Badge variant="success" className="bg-primary/10 text-primary border-primary/20">
            Mejores terceros: 8 aciertos=20 / 4-7=10
          </Badge>
        </div>

        {isLocked ? (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-400">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Predicciones pre-torneo cerradas — ya no pueden modificarse
          </div>
        ) : lockAt ? (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Cierran el {formatLockDate(lockAt)}
          </div>
        ) : null}
      </header>

      {/* ── Campeón ─────────────────────────────────────────────────────────── */}
      <TeamPickerAccordion
        label="Campeón del torneo"
        icon={Trophy}
        teams={data.tournamentTeams}
        selectedId={championId}
        onSelect={(id) => { setChampionId(id); if (id) setOpenSection(null); }}
        disabled={isLocked}
        selectedTeam={championTeam}
        isOpen={openSection === 'champion'}
        onToggle={() => toggle('champion')}
        fieldScore={fb?.champion}
      />

      {/* ── Subcampeón ──────────────────────────────────────────────────────── */}
      <TeamPickerAccordion
        label="Subcampeón del torneo"
        icon={Medal}
        teams={data.tournamentTeams}
        selectedId={runnerUpId}
        onSelect={(id) => { setRunnerUpId(id); if (id) setOpenSection(null); }}
        disabled={isLocked}
        selectedTeam={runnerUpTeam}
        isOpen={openSection === 'runnerUp'}
        onToggle={() => toggle('runnerUp')}
        fieldScore={fb?.runnerUp}
      />

      {/* ── Tercer puesto ───────────────────────────────────────────────────── */}
      <TeamPickerAccordion
        label="Tercer puesto"
        icon={Medal}
        teams={data.tournamentTeams}
        selectedId={thirdPlaceId}
        onSelect={(id) => { setThirdPlaceId(id); if (id) setOpenSection(null); }}
        disabled={isLocked}
        selectedTeam={thirdPlaceTeam}
        isOpen={openSection === 'thirdPlace'}
        onToggle={() => toggle('thirdPlace')}
        fieldScore={fb?.thirdPlace}
      />

      {/* ── Duplicate team warning ───────────────────────────────────────────── */}
      {hasDuplicateTeams && (
        <div
          role="alert"
          className="rounded-xl border border-primary/20 bg-primary/8 px-4 py-3 text-sm font-semibold text-primary/80"
        >
          Campeón, subcampeón y tercer puesto deben ser equipos distintos.
        </div>
      )}

      {/* ── Bota de Oro ─────────────────────────────────────────────────────── */}
      <PlayerPickerAccordion
        label="Bota de Oro · Goleador del torneo"
        icon={Goal}
        players={realPlayers}
        selectedId={topScorerId}
        onSelect={(id) => { setTopScorerId(id); if (id) setOpenSection(null); }}
        disabled={isLocked}
        selectedPlayer={topScorerPlayer}
        isOpen={openSection === 'topScorer'}
        onToggle={() => toggle('topScorer')}
        hasRealPlayers={hasRealPlayers}
        fieldScore={fb?.topScorer}
      />

      {/* ── Balón de Oro ────────────────────────────────────────────────────── */}
      <PlayerPickerAccordion
        label="Balón de Oro · Mejor jugador"
        icon={Award}
        players={realPlayers}
        selectedId={goldenBallId}
        onSelect={(id) => { setGoldenBallId(id); if (id) setOpenSection(null); }}
        disabled={isLocked}
        selectedPlayer={goldenBallPlayer}
        isOpen={openSection === 'goldenBall'}
        onToggle={() => toggle('goldenBall')}
        hasRealPlayers={hasRealPlayers}
        fieldScore={fb?.goldenBall}
      />

      {/* ── Guante de Oro ───────────────────────────────────────────────────── */}
      <PlayerPickerAccordion
        label="Guante de Oro · Mejor portero"
        icon={ShieldCheck}
        players={realGoalkeepers}
        selectedId={goldenGloveId}
        onSelect={(id) => { setGoldenGloveId(id); if (id) setOpenSection(null); }}
        disabled={isLocked}
        selectedPlayer={goldenGlovePlayer}
        isOpen={openSection === 'goldenGlove'}
        onToggle={() => toggle('goldenGlove')}
        hasRealPlayers={hasRealPlayers}
        fieldScore={fb?.goldenGlove}
      />

      {/* ── Mejores terceros ────────────────────────────────────────────────── */}
      <BestThirdsPickerSection
        teams={data.tournamentTeams}
        selectedIds={bestThirdsIds}
        onToggle={(id) => {
          setBestThirdsIds((prev) =>
            prev.includes(id)
              ? prev.filter((x) => x !== id)
              : prev.length < BEST_THIRDS_REQUIRED
              ? [...prev, id]
              : prev,
          );
        }}
        disabled={isLocked}
        isOpen={openSection === 'bestThirds'}
        onToggleOpen={() => toggle('bestThirds')}
        fieldScore={fb?.bestThirds}
      />

      {/* ── Save error ──────────────────────────────────────────────────────── */}
      {error && <StatePanel variant="error" description={error} compact />}

      {/* ── Save CTA ────────────────────────────────────────────────────────── */}
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

// ── BestThirdsPickerSection ───────────────────────────────────────────────────

function BestThirdsPickerSection({
  teams,
  selectedIds,
  onToggle,
  disabled,
  isOpen,
  onToggleOpen,
  fieldScore,
}: {
  teams: TournamentTeamOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  fieldScore?: (TournamentFieldScore & { hits: number; total: number }) | null;
}) {
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const count = selectedIds.length;
  const isComplete = count === BEST_THIRDS_REQUIRED;

  useEffect(() => {
    if (isOpen && !disabled) {
      const t = setTimeout(() => searchRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    if (!isOpen) setSearch('');
  }, [isOpen, disabled]);

  const filtered = teams.filter((t) => {
    const q = normalizeSearchText(search);
    return normalizeSearchText(t.team.name).includes(q) || normalizeSearchText(t.team.code).includes(q);
  });

  const selectedTeams = selectedIds
    .map((id) => teams.find((t) => t.id === id))
    .filter(Boolean) as TournamentTeamOption[];

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-surface shadow-card-sm shadow-inner-subtle">

      {/* ── Accordion header ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={disabled ? undefined : onToggleOpen}
        disabled={disabled}
        aria-expanded={isOpen}
        className={cn(
          'flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          !disabled && 'transition-colors duration-150 hover:bg-white/[0.03]',
          disabled && 'cursor-default',
        )}
      >
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Users className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 pr-2">
            <p className="truncate text-sm font-bold text-foreground">Mejores terceros clasificados</p>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary">
              8=20 pts / 4-7=10 pts
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isComplete
              ? '8/8 equipos seleccionados'
              : count > 0
              ? `${count}/8 equipos seleccionados`
              : 'Selecciona 8 equipos que crees que pasan como mejores terceros'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 pl-2">
          {fieldScore && fieldScore.isCorrect !== null ? (
            <BestThirdsScoreBadge score={fieldScore} />
          ) : isComplete ? (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
              <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
            </span>
          ) : null}
          {!disabled && (
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
          )}
        </div>
      </button>

      {/* ── Chips (selected) ─────────────────────────────────────────────────── */}
      {selectedTeams.length > 0 && !isOpen && (
        <div className="flex flex-wrap gap-1.5 border-t border-white/[0.05] px-4 py-2.5">
          {selectedTeams.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold text-primary"
            >
              {t.team.flagEmoji && <span className="leading-none">{t.team.flagEmoji}</span>}
              {t.team.code}
            </span>
          ))}
        </div>
      )}

      {/* ── Accordion body ───────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="border-t border-white/[0.05] px-3 pb-3 pt-2.5">
          {/* Counter + chips */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {selectedTeams.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => !disabled && onToggle(t.id)}
                  disabled={disabled}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/30"
                >
                  {t.team.flagEmoji && <span className="leading-none">{t.team.flagEmoji}</span>}
                  {t.team.code}
                  {!disabled && <span aria-hidden="true" className="ml-0.5 text-primary/60">×</span>}
                </button>
              ))}
            </div>
            <span
              className={cn(
                'shrink-0 text-xs font-bold tabular-nums',
                isComplete ? 'text-emerald-400' : 'text-muted-foreground',
              )}
            >
              {count}/{BEST_THIRDS_REQUIRED}
            </span>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar selección..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>

          {/* List */}
          <div className="scrollbar-sport max-h-56 overflow-y-auto [-webkit-overflow-scrolling:touch] rounded-xl border border-border/40 bg-background/60">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">Sin resultados.</p>
            ) : (
              <div className="p-1">
                {filtered.map((t) => {
                  const isSelected = selectedIds.includes(t.id);
                  const isDisabledItem = !isSelected && count >= BEST_THIRDS_REQUIRED;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="checkbox"
                      aria-checked={isSelected}
                      disabled={disabled || isDisabledItem}
                      onClick={() => onToggle(t.id)}
                      className={cn(
                        'flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left',
                        'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-card-sm'
                          : isDisabledItem
                          ? 'cursor-not-allowed text-muted-foreground/40'
                          : 'text-foreground hover:bg-muted',
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

          {!isComplete && count < BEST_THIRDS_REQUIRED && (
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              Selecciona {BEST_THIRDS_REQUIRED - count} equipo{BEST_THIRDS_REQUIRED - count !== 1 ? 's' : ''} más
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── TeamPickerAccordion ───────────────────────────────────────────────────────

function TeamPickerAccordion({
  label,
  icon: Icon,
  teams,
  selectedId,
  onSelect,
  disabled,
  selectedTeam,
  isOpen,
  onToggle,
  fieldScore,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  teams: TournamentTeamOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled: boolean;
  selectedTeam: TournamentTeamOption | undefined;
  isOpen: boolean;
  onToggle: () => void;
  fieldScore?: TournamentFieldScore | null;
}) {
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && !disabled) {
      const t = setTimeout(() => searchRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    if (!isOpen) setSearch('');
  }, [isOpen, disabled]);

  const filtered = teams.filter((t) => {
    const q = normalizeSearchText(search);
    return normalizeSearchText(t.team.name).includes(q) || normalizeSearchText(t.team.code).includes(q);
  });

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-surface shadow-card-sm shadow-inner-subtle">

      {/* ── Accordion header ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={disabled ? undefined : onToggle}
        disabled={disabled}
        aria-expanded={isOpen}
        className={cn(
          'flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          !disabled && 'transition-colors duration-150 hover:bg-white/[0.03]',
          disabled && 'cursor-default',
        )}
      >
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 pr-2">
            <p className="truncate text-sm font-bold text-foreground">{label}</p>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary">
              15 pts
            </span>
          </div>
          {selectedTeam ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {selectedTeam.team.flagEmoji ? `${selectedTeam.team.flagEmoji} ` : ''}
              {selectedTeam.team.name}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground/50">Sin seleccionar</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 pl-2">
          {fieldScore && fieldScore.isCorrect !== null ? (
            <FieldScoreBadge score={fieldScore} />
          ) : selectedTeam ? (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
              <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
            </span>
          ) : null}
          {!disabled && (
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
          )}
        </div>
      </button>

      {/* ── Accordion body ───────────────────────────────────────────────────── */}
      {isOpen && (
        <div className="border-t border-white/[0.05] px-3 pb-3 pt-2.5">
          {/* Search */}
          <div className="relative mb-2">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar selección..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>

          {/* List */}
          <div className="scrollbar-sport max-h-52 overflow-y-auto [-webkit-overflow-scrolling:touch] rounded-xl border border-border/40 bg-background/60">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">Sin resultados.</p>
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
                      onClick={() => onSelect(isSelected ? '' : t.id)}
                      className={cn(
                        'flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left',
                        'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-card-sm'
                          : 'text-foreground hover:bg-muted',
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
      )}
    </div>
  );
}

// ── PlayerPickerAccordion ─────────────────────────────────────────────────────

function PlayerPickerAccordion({
  label,
  icon: Icon,
  players,
  selectedId,
  onSelect,
  disabled,
  selectedPlayer,
  isOpen,
  onToggle,
  hasRealPlayers,
  fieldScore,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  players: TournamentPlayerOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled: boolean;
  selectedPlayer: TournamentPlayerOption | undefined;
  isOpen: boolean;
  onToggle: () => void;
  hasRealPlayers: boolean;
  fieldScore?: TournamentFieldScore | null;
}) {
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const canOpen = !disabled && hasRealPlayers;

  useEffect(() => {
    if (isOpen && canOpen) {
      const t = setTimeout(() => searchRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    if (!isOpen) setSearch('');
  }, [isOpen, canOpen]);

  const filtered = players.filter((p) => matchesPlayerSearch(p.player, search));

  const selectedFlag = selectedPlayer ? getFlagEmoji(selectedPlayer.player.nationalityCode) : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-surface shadow-card-sm shadow-inner-subtle">

      {/* ── Accordion header ─────────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={canOpen ? onToggle : undefined}
        disabled={!canOpen}
        aria-expanded={isOpen}
        className={cn(
          'flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          canOpen && 'transition-colors duration-150 hover:bg-white/[0.03]',
          !canOpen && 'cursor-default',
        )}
      >
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <Icon className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 pr-2">
            <p className="truncate text-sm font-bold text-foreground">{label}</p>
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-primary">
              10 pts
            </span>
          </div>
          {!hasRealPlayers ? (
            <p className="mt-0.5 text-xs text-muted-foreground/50">Jugadores por definir</p>
          ) : selectedPlayer ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {selectedFlag ? `${selectedFlag} ` : ''}
              {getPlayerDisplayName(selectedPlayer.player)}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground/50">Sin seleccionar</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 pl-2">
          {fieldScore && fieldScore.isCorrect !== null ? (
            <FieldScoreBadge score={fieldScore} />
          ) : selectedPlayer && hasRealPlayers ? (
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20">
              <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
            </span>
          ) : null}
          {canOpen && (
            <ChevronDown
              className={cn(
                'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                isOpen && 'rotate-180',
              )}
              aria-hidden="true"
            />
          )}
        </div>
      </button>

      {/* ── Accordion body ───────────────────────────────────────────────────── */}
      {isOpen && canOpen && (
        <div className="border-t border-white/[0.05] px-3 pb-3 pt-2.5">
          {/* Search */}
          <div className="relative mb-2">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              type="text"
              placeholder="Buscar jugador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/25"
            />
          </div>

          {/* List */}
          <div className="scrollbar-sport max-h-52 overflow-y-auto [-webkit-overflow-scrolling:touch] rounded-xl border border-border/40 bg-background/60">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-muted-foreground">Sin resultados.</p>
            ) : (
              <div className="p-1">
                {filtered.map((p) => {
                  const isSelected = p.id === selectedId;
                  const countryCode = (p.player.nationalityCode ?? '').toUpperCase();
                  const flag = getFlagEmoji(p.player.nationalityCode);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => onSelect(isSelected ? '' : p.id)}
                      className={cn(
                        'flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left',
                        'transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        isSelected
                          ? 'bg-primary text-primary-foreground shadow-card-sm'
                          : 'text-foreground hover:bg-muted',
                      )}
                    >
                      <span className="flex-1 truncate text-sm font-medium">
                        {getPlayerDisplayName(p.player)}
                      </span>
                      {countryCode && (
                        <span
                          className={cn(
                            'inline-flex shrink-0 items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em]',
                            isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground',
                          )}
                        >
                          {flag && <span className="text-base leading-none">{flag}</span>}
                          {countryCode}
                        </span>
                      )}
                      {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
