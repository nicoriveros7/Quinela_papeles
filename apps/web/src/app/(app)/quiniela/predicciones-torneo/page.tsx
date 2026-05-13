'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Trophy, Medal, Goal } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { TournamentPredictionResponse, TournamentTeamOption, TournamentPlayerOption } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatePanel } from '@/components/ui/state-panel';

export default function PrediccionesTorneoPage() {
  const { token } = useAuth();
  const [data, setData] = useState<TournamentPredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [championId, setChampionId] = useState<string>('');
  const [runnerUpId, setRunnerUpId] = useState<string>('');
  const [topScorerId, setTopScorerId] = useState<string>('');

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
    setSaved(false);
    try {
      await api.upsertMainTournamentPrediction(
        {
          championTournamentTeamId: championId || null,
          runnerUpTournamentTeamId: runnerUpId || null,
          topScorerTournamentPlayerId: topScorerId || null,
        },
        token,
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
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

  return (
    <div className="grid gap-5">
      <header className="rounded-2xl border border-border/70 bg-surface p-4">
        <h1 className="text-2xl font-extrabold">Predicciones del torneo</h1>
        <p className="text-sm text-muted-foreground">
          Predice el campeón, subcampeón y goleador antes de que empiece el Mundial.
        </p>
        {isLocked && (
          <p className="mt-2 text-xs font-semibold text-red-600">
            Las predicciones están bloqueadas — el torneo ya comenzó.
          </p>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-1">
        <PredictionSelect
          label="Campeón del torneo"
          icon={Trophy}
          value={championId}
          onChange={setChampionId}
          options={data.tournamentTeams}
          renderOption={(t) => `${t.team.code} — ${t.team.name}`}
          disabled={isLocked}
        />

        <PredictionSelect
          label="Subcampeón del torneo"
          icon={Medal}
          value={runnerUpId}
          onChange={setRunnerUpId}
          options={data.tournamentTeams}
          renderOption={(t) => `${t.team.code} — ${t.team.name}`}
          disabled={isLocked}
        />

        <PredictionSelect
          label="Goleador del torneo"
          icon={Goal}
          value={topScorerId}
          onChange={setTopScorerId}
          options={data.tournamentPlayers}
          renderOption={(p) => p.player.fullName}
          disabled={isLocked}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!isLocked && (
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? 'Guardando...' : 'Guardar predicciones'}
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Guardado
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function PredictionSelect<T extends TournamentTeamOption | TournamentPlayerOption>({
  label,
  icon: Icon,
  value,
  onChange,
  options,
  renderOption,
  disabled,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  onChange: (v: string) => void;
  options: T[];
  renderOption: (opt: T) => string;
  disabled: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="h-4 w-4 text-primary" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">— Sin seleccionar —</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {renderOption(opt)}
            </option>
          ))}
        </select>
      </CardContent>
    </Card>
  );
}
