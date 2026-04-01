'use client';

import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { formatDateTime, matchStatusLabel, questionTypeLabel } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';
import { MatchPredictionsBundle, PoolDetail, PoolMatch, PoolMatchesResponse } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingBlock } from '@/components/ui/loading';

type QuestionDraft = {
  selectedOptionId?: string;
  selectedBoolean?: boolean;
  selectedTeamId?: string;
  selectedTimeRangeKey?: string;
};

export default function EntryPredictionsPage() {
  const params = useParams<{ poolId: string; entryId: string }>();
  const poolId = params.poolId;
  const entryId = params.entryId;

  const { token } = useAuth();

  const [pool, setPool] = useState<PoolDetail | null>(null);
  const [matches, setMatches] = useState<PoolMatch[]>([]);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [bundle, setBundle] = useState<MatchPredictionsBundle | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, QuestionDraft>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.id === selectedMatchId) ?? null,
    [matches, selectedMatchId],
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [poolData, matchesData] = await Promise.all([
          api.getPool(poolId, token),
          api.listPoolMatches(poolId, token),
        ]);

        setPool(poolData);
        const list = (matchesData as PoolMatchesResponse).matches;
        setMatches(list);
        setSelectedMatchId(list[0]?.id ?? null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'No se pudo cargar la pantalla de predicciones.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [poolId, token]);

  useEffect(() => {
    if (!token || !selectedMatchId) {
      return;
    }

    const loadBundle = async () => {
      setError(null);
      setSuccess(null);
      try {
        const data = await api.getEntryMatchPredictions(poolId, entryId, selectedMatchId, token);
        setBundle(data);
        setHomeScore(data.matchPrediction?.predictedHomeScore?.toString() ?? '');
        setAwayScore(data.matchPrediction?.predictedAwayScore?.toString() ?? '');

        const drafts: Record<string, QuestionDraft> = {};
        for (const prediction of data.questionPredictions) {
          drafts[prediction.matchQuestionId] = {
            selectedOptionId: prediction.selectedOptionId ?? undefined,
            selectedBoolean: prediction.selectedBoolean ?? undefined,
            selectedTeamId: prediction.selectedTeamId ?? undefined,
            selectedTimeRangeKey: prediction.selectedTimeRangeKey ?? undefined,
          };
        }
        setQuestionDrafts(drafts);
      } catch (err) {
        setBundle(null);
        setError(err instanceof ApiError ? err.message : 'No se pudieron cargar predicciones del partido.');
      }
    };

    void loadBundle();
  }, [entryId, poolId, selectedMatchId, token]);

  const saveMatchPrediction = async () => {
    if (!token || !selectedMatchId) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.upsertMatchPrediction(
        poolId,
        entryId,
        selectedMatchId,
        Number(homeScore),
        Number(awayScore),
        token,
      );
      setSuccess('Prediccion de marcador guardada.');
      const updated = await api.getEntryMatchPredictions(poolId, entryId, selectedMatchId, token);
      setBundle(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la prediccion de marcador.');
    } finally {
      setSaving(false);
    }
  };

  const saveQuestionPrediction = async (questionId: string) => {
    if (!token) {
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.upsertQuestionPrediction(poolId, entryId, questionId, questionDrafts[questionId] ?? {}, token);
      setSuccess('Prediccion bonus guardada.');
      if (selectedMatchId) {
        const updated = await api.getEntryMatchPredictions(poolId, entryId, selectedMatchId, token);
        setBundle(updated);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la prediccion bonus.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingBlock label="Cargando entry y calendario..." />;
  }

  return (
    <div className="grid gap-4">
      <header className="rounded-2xl border border-border/70 bg-surface p-4">
        <h1 className="text-xl font-extrabold">Predicciones de Entry</h1>
        <p className="text-sm text-muted-foreground">
          Pool: {pool?.name ?? '-'} · Entry: {entryId.slice(-6)}
        </p>
      </header>

      <section className="overflow-x-auto rounded-2xl border border-border/70 bg-surface p-3">
        <div className="flex min-w-max gap-2">
          {matches.map((match) => (
            <button
              key={match.id}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition ${
                selectedMatchId === match.id
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/70 bg-white/70 text-foreground'
              }`}
              onClick={() => setSelectedMatchId(match.id)}
            >
              <p className="font-semibold">{match.homeTournamentTeam.team.code} vs {match.awayTournamentTeam.team.code}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(match.kickoffAt)}</p>
            </button>
          ))}
        </div>
      </section>

      {selectedMatch ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span>
                {selectedMatch.homeTournamentTeam.team.name} vs {selectedMatch.awayTournamentTeam.team.name}
              </span>
              <Badge variant={selectedMatch.status === 'FINISHED' ? 'success' : 'muted'}>
                {matchStatusLabel(selectedMatch.status)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p className="text-sm text-muted-foreground">Kickoff: {formatDateTime(selectedMatch.kickoffAt)}</p>

            <div className="grid gap-2 sm:max-w-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center">
              <Input
                type="number"
                min={0}
                value={homeScore}
                onChange={(e) => setHomeScore(e.target.value)}
                placeholder="Local"
              />
              <span className="text-center text-sm font-bold text-muted-foreground">-</span>
              <Input
                type="number"
                min={0}
                value={awayScore}
                onChange={(e) => setAwayScore(e.target.value)}
                placeholder="Visita"
              />
              <Button
                className="sm:col-span-3"
                onClick={saveMatchPrediction}
                disabled={saving || homeScore === '' || awayScore === ''}
              >
                <Save className="mr-2 h-4 w-4" />
                Guardar marcador
              </Button>
            </div>

            <div className="grid gap-3">
              {bundle?.questions.map((question) => (
                <Card key={question.id} className="border border-border/60 bg-white/70">
                  <CardContent className="grid gap-2 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{question.questionText}</h3>
                      <Badge variant="muted">{questionTypeLabel(question.answerType)}</Badge>
                      {question.isResolved ? <Badge variant="warning">Resuelta</Badge> : null}
                    </div>

                    <QuestionInput
                      question={question}
                      value={questionDrafts[question.id]}
                      onChange={(next) =>
                        setQuestionDrafts((prev) => ({
                          ...prev,
                          [question.id]: next,
                        }))
                      }
                    />

                    <div>
                      <Button size="sm" onClick={() => saveQuestionPrediction(question.id)} disabled={saving || question.isResolved}>
                        Guardar bonus
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {error ? <p className="text-sm font-semibold text-rose-600">{error}</p> : null}
            {success ? <p className="text-sm font-semibold text-emerald-700">{success}</p> : null}
          </CardContent>
        </Card>
      ) : (
        <LoadingBlock label="No hay partidos disponibles para esta pool." />
      )}
    </div>
  );
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: MatchPredictionsBundle['questions'][number];
  value: QuestionDraft | undefined;
  onChange: (value: QuestionDraft) => void;
}) {
  if (question.answerType === 'BOOLEAN') {
    return (
      <div className="flex gap-2">
        <Button
          type="button"
          variant={value?.selectedBoolean === true ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange({ selectedBoolean: true })}
        >
          Si
        </Button>
        <Button
          type="button"
          variant={value?.selectedBoolean === false ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange({ selectedBoolean: false })}
        >
          No
        </Button>
      </div>
    );
  }

  if (question.answerType === 'TIME_RANGE') {
    return (
      <div className="grid gap-1">
        {question.options.map((option) => (
          <label key={option.id} className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={question.id}
              checked={value?.selectedTimeRangeKey === option.key}
              onChange={() => onChange({ selectedTimeRangeKey: option.key })}
            />
            {option.label}
          </label>
        ))}
      </div>
    );
  }

  if (question.answerType === 'TEAM_PICK') {
    return (
      <div className="grid gap-1">
        {question.options.map((option) => (
          <label key={option.id} className="inline-flex items-center gap-2 text-sm">
            <input
              type="radio"
              name={question.id}
              checked={value?.selectedOptionId === option.id}
              onChange={() => onChange({ selectedOptionId: option.id })}
            />
            {option.label}
          </label>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      {question.options.map((option) => (
        <label key={option.id} className="inline-flex items-center gap-2 text-sm">
          <input
            type="radio"
            name={question.id}
            checked={value?.selectedOptionId === option.id}
            onChange={() => onChange({ selectedOptionId: option.id })}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
