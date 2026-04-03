'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Plus, Save } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import { AdminMatchQuestion, CreateAdminQuestionPayload } from '@/types/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmActionButton } from '@/components/ui/confirm-action-button';
import { Input } from '@/components/ui/input';
import { StatePanel } from '@/components/ui/state-panel';

type NewQuestionForm = {
  questionText: string;
  answerType: 'BOOLEAN' | 'SINGLE_CHOICE' | 'TEAM_PICK' | 'TIME_RANGE';
  points: string;
  lockAt: string;
  optionLabels: string;
};

export default function MatchQuestionsPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params?.matchId ?? '';
  const { token } = useAuth();
  const [questions, setQuestions] = useState<AdminMatchQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState<NewQuestionForm>({
    questionText: '',
    answerType: 'BOOLEAN',
    points: '1',
    lockAt: '',
    optionLabels: '',
  });
  const [editingPrompt, setEditingPrompt] = useState<Record<string, string>>({});
  const [resolutionDraft, setResolutionDraft] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedOption, setSelectedOption] = useState<Record<string, string>>({});

  const loadQuestions = useCallback(async () => {
    if (!token) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.adminListMatchQuestions(matchId, token);
      setQuestions(data.questions);
      setEditingPrompt(Object.fromEntries(data.questions.map((q) => [q.id, q.questionText])));
      setResolutionDraft(Object.fromEntries(data.questions.map((q) => [q.id, q.correctOptionId ?? ''])));
      setSelectedOption(Object.fromEntries(data.questions.map((q) => [q.id, q.correctOptionId ?? q.options[0]?.id ?? ''])));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudieron cargar las preguntas.');
    } finally {
      setLoading(false);
    }
  }, [token, matchId]);

  useEffect(() => {
    void loadQuestions();
  }, [loadQuestions]);

  const createQuestion = async () => {
    if (!token) {
      return;
    }
    if (!newQuestion.questionText.trim()) {
      setError('El enunciado es obligatorio.');
      return;
    }
    const points = Number(newQuestion.points);
    if (Number.isNaN(points) || points < 0) {
      setError('Points debe ser un número mayor o igual a 0.');
      return;
    }

    const payload: CreateAdminQuestionPayload = {
      questionText: newQuestion.questionText.trim(),
      answerType: newQuestion.answerType,
      pointsOverride: points,
      isPublished: true,
    };

    if (newQuestion.lockAt) {
      payload.lockAt = new Date(newQuestion.lockAt).toISOString();
    }

    if (newQuestion.answerType !== 'BOOLEAN') {
      const labels = newQuestion.optionLabels
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      if (labels.length < 2) {
        setError('Para preguntas no BOOLEAN debes ingresar al menos 2 opciones separadas por coma.');
        return;
      }

      payload.options = labels.map((label, index) => ({
        key: `OPT_${index + 1}`,
        label,
      }));
    }

    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await api.adminCreateQuestion(matchId, payload, token);
      setQuestions((prev) => [created, ...prev]);
      setEditingPrompt((prev) => ({ ...prev, [created.id]: created.questionText }));
      setResolutionDraft((prev) => ({ ...prev, [created.id]: created.correctOptionId ?? '' }));
      setSelectedOption((prev) => ({ ...prev, [created.id]: created.options[0]?.id ?? '' }));
      setNewQuestion({ questionText: '', answerType: 'BOOLEAN', points: '1', lockAt: '', optionLabels: '' });
      setSuccess('Pregunta creada.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la pregunta.');
    } finally {
      setCreating(false);
    }
  };

  const saveQuestion = async (questionId: string) => {
    if (!token) {
      return;
    }

    const questionText = (editingPrompt[questionId] ?? '').trim();
    if (!questionText) {
      setError('El enunciado no puede quedar vacío.');
      return;
    }

    setWorkingId(questionId);
    setError(null);
    setSuccess(null);
    try {
      const updated = await api.adminUpdateQuestion(questionId, { questionText, isPublished: true }, token);
      setQuestions((prev) => prev.map((q) => (q.id === questionId ? updated : q)));
      setSuccess('Pregunta actualizada.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar la pregunta.');
    } finally {
      setWorkingId(null);
    }
  };

  const resolveQuestion = async (questionId: string) => {
    if (!token) {
      return;
    }

    const optionId = selectedOption[questionId] || resolutionDraft[questionId];
    if (!optionId) {
      setError('Debes seleccionar una opción correcta.');
      return;
    }

    setWorkingId(questionId);
    setError(null);
    setSuccess(null);
    try {
      const resolved = await api.adminResolveQuestion(questionId, optionId, token);
      setQuestions((prev) => prev.map((q) => (q.id === questionId ? resolved : q)));
      setSuccess('Pregunta resuelta.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo resolver la pregunta.');
    } finally {
      setWorkingId(null);
    }
  };

  if (loading) {
    return <StatePanel variant="loading" description="Cargando bonus questions..." />;
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="gap-3">
          <Link href="/admin/tournaments" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em] text-primary">
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver
          </Link>
          <CardTitle>Bonus Questions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {error && <StatePanel variant="error" description={error} compact />}
          {success && <StatePanel variant="success" description={success} compact />}

          <div className="grid gap-2 rounded-2xl border border-border/70 p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-end">
            <Input
              placeholder="Nueva pregunta"
              value={newQuestion.questionText}
              onChange={(event) => setNewQuestion((prev) => ({ ...prev, questionText: event.target.value }))}
            />
            <select
              value={newQuestion.answerType}
              onChange={(event) => setNewQuestion((prev) => ({ ...prev, answerType: event.target.value as NewQuestionForm['answerType'] }))}
              className="h-10 rounded-md border border-border/70 bg-background px-3 text-sm"
            >
              <option value="BOOLEAN">BOOLEAN</option>
              <option value="SINGLE_CHOICE">SINGLE_CHOICE</option>
              <option value="TEAM_PICK">TEAM_PICK</option>
              <option value="TIME_RANGE">TIME_RANGE</option>
            </select>
            <Input
              type="number"
              min={0}
              placeholder="Points"
              value={newQuestion.points}
              onChange={(event) => setNewQuestion((prev) => ({ ...prev, points: event.target.value }))}
            />
            <Input
              type="datetime-local"
              value={newQuestion.lockAt}
              onChange={(event) => setNewQuestion((prev) => ({ ...prev, lockAt: event.target.value }))}
            />
            <Button size="sm" onClick={() => void createQuestion()} disabled={creating}>
              <Plus className="mr-1.5 h-4 w-4" />
              {creating ? 'Creando...' : 'Crear'}
            </Button>
          </div>
          {newQuestion.answerType !== 'BOOLEAN' && (
            <Input
              placeholder="Opciones separadas por coma (ej: Equipo A, Empate, Equipo B)"
              value={newQuestion.optionLabels}
              onChange={(event) => setNewQuestion((prev) => ({ ...prev, optionLabels: event.target.value }))}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preguntas existentes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {questions.length === 0 && <StatePanel variant="empty" description="No hay preguntas para este match." />}

          {questions.map((question) => (
            <article key={question.id} className="grid gap-2 rounded-2xl border border-border/70 p-3">
              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                <Input
                  value={editingPrompt[question.id] ?? ''}
                  onChange={(event) =>
                    setEditingPrompt((prev) => ({
                      ...prev,
                      [question.id]: event.target.value,
                    }))
                  }
                />
                <select
                  value={selectedOption[question.id] ?? ''}
                  onChange={(event) =>
                    setSelectedOption((prev) => ({
                      ...prev,
                      [question.id]: event.target.value,
                    }))
                  }
                  className="h-10 rounded-md border border-border/70 bg-background px-3 text-sm"
                >
                  {question.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => void saveQuestion(question.id)} disabled={workingId === question.id}>
                    <Save className="mr-1.5 h-4 w-4" />
                    Guardar
                  </Button>
                  <ConfirmActionButton
                    size="sm"
                    label="Resolver"
                    confirmLabel="Si, resolver"
                    title="Confirmar resolución"
                    description="La pregunta quedara resuelta con la opcion seleccionada actualmente."
                    disabled={workingId === question.id || question.isResolved}
                    onConfirm={() => resolveQuestion(question.id)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Tipo: {question.answerType} · Points: {question.pointsOverride ?? '-'} · Publicada: {question.isPublished ? 'si' : 'no'}
              </p>
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
