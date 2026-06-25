'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Star, Zap } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { MatchHighlight, LatestMatchHighlightsResponse } from '@/types/api';

const EXACT_PREVIEW = 8;

interface LatestMatchCardProps {
  data: NonNullable<LatestMatchHighlightsResponse>;
}

export function LatestMatchCard({ data }: LatestMatchCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { matches } = data;
  const count = matches.length;

  if (count === 0) return null;

  const first = matches[0];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-surface shadow-card-sm overflow-hidden">
      {/* Clickable header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="w-full text-left px-4 pt-3 pb-2.5 flex items-start gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            {count === 1 ? 'Último partido' : 'Últimos partidos'}
          </p>

          {count === 1 ? (
            <div className="mt-1 flex items-center gap-1.5">
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                {teamLabel(first.match.homeTeamFlagEmoji, first.match.homeTeam ?? first.match.homeTeamCode)}
              </span>
              <span className="shrink-0 tabular-nums text-base font-extrabold text-foreground">
                {first.match.homeScore}–{first.match.awayScore}
              </span>
              <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-foreground">
                {teamLabel(first.match.awayTeamFlagEmoji, first.match.awayTeam ?? first.match.awayTeamCode)}
              </span>
            </div>
          ) : (
            <p className="mt-1 text-sm font-semibold text-foreground">
              {count} partidos cerrados recientemente
            </p>
          )}

          <p className="mt-1 text-[11px] font-semibold text-primary">
            {expanded ? 'Ocultar detalles' : 'Ver detalles'}
          </p>
        </div>

        <div className="shrink-0 mt-1 text-muted-foreground">
          {expanded
            ? <ChevronUp className="h-4 w-4" aria-hidden="true" />
            : <ChevronDown className="h-4 w-4" aria-hidden="true" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-border/50 px-4 py-3 grid gap-4 animate-fade-in">
          {matches.map((hl, idx) => (
            <MatchHighlightSection
              key={hl.match.id}
              highlight={hl}
              showDivider={idx > 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── MatchHighlightSection ─────────────────────────────────────────────────────

function MatchHighlightSection({
  highlight,
  showDivider,
}: {
  highlight: MatchHighlight;
  showDivider: boolean;
}) {
  const [showAllExact, setShowAllExact] = useState(false);
  const { match, exactHits, exactHitters, participantsWithPoints, topScorers } = highlight;

  const visibleHitters = showAllExact ? exactHitters : exactHitters.slice(0, EXACT_PREVIEW);
  const hiddenCount = exactHitters.length - EXACT_PREVIEW;

  return (
    <div className={cn('grid gap-3', showDivider && 'border-t border-border/40 pt-3')}>
      {/* Match result header */}
      <div>
        <div className="flex items-center gap-1.5">
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {teamLabel(match.homeTeamFlagEmoji, match.homeTeam ?? match.homeTeamCode)}
          </span>
          <span className="shrink-0 tabular-nums text-base font-extrabold text-foreground">
            {match.homeScore}–{match.awayScore}
          </span>
          <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-foreground">
            {teamLabel(match.awayTeamFlagEmoji, match.awayTeam ?? match.awayTeamCode)}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {participantsWithPoints} con puntos
          {match.roundLabel ? ` · ${match.roundLabel}` : ''}
        </p>
      </div>

      {/* Exactos */}
      {exactHits > 0 ? (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Star className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
            <span className="text-[11px] font-bold text-emerald-400">
              {exactHits} {exactHits === 1 ? 'exacto' : 'exactos'}
            </span>
          </div>
          <div className="flex flex-wrap gap-1">
            {visibleHitters.map((name) => (
              <span
                key={name}
                className="inline-block rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-300"
              >
                {name}
              </span>
            ))}
            {!showAllExact && hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowAllExact(true)}
                className="inline-flex items-center gap-0.5 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
                Ver todos ({exactHits})
              </button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-[11px] text-muted-foreground italic">
          Nadie acertó el marcador exacto.
        </p>
      )}

      {/* Top scorers */}
      {topScorers.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
            Top del partido
          </p>
          <TopScorerList scorers={topScorers} />
        </div>
      )}
    </div>
  );
}

// ── TopScorerList ─────────────────────────────────────────────────────────────

type Scorer = MatchHighlight['topScorers'][number];

function TopScorerList({ scorers }: { scorers: Scorer[] }) {
  let visualRank = 1;
  return (
    <div className="grid gap-1">
      {scorers.map((scorer, idx) => {
        if (idx > 0 && scorers[idx - 1].pointsFromMatch !== scorer.pointsFromMatch) {
          visualRank = idx + 1;
        }
        return (
          <TopScorerRow key={`${scorer.displayName}-${idx}`} scorer={scorer} rank={visualRank} />
        );
      })}
    </div>
  );
}

function TopScorerRow({ scorer, rank }: { scorer: Scorer; rank: number }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg px-2.5 py-1.5',
        rank === 1 ? 'bg-primary/8' : 'bg-muted/40',
      )}
    >
      <span
        className={cn(
          'w-5 shrink-0 text-center text-[11px] font-bold tabular-nums',
          rank === 1 ? 'text-primary' : 'text-muted-foreground',
        )}
      >
        {rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
        {scorer.displayName}
      </span>
      {scorer.hadJoker && (
        <Zap className="h-3 w-3 shrink-0 text-amber-400" aria-hidden="true" />
      )}
      {scorer.hadExactScore && (
        <Star className="h-3 w-3 shrink-0 text-emerald-400" aria-hidden="true" />
      )}
      <span
        className={cn(
          'shrink-0 tabular-nums text-[12px] font-bold',
          rank === 1 ? 'text-primary' : 'text-foreground',
        )}
      >
        {scorer.pointsFromMatch} pts
      </span>
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────

function teamLabel(flagEmoji: string | null, name: string | null | undefined): string {
  const flag = flagEmoji ? `${flagEmoji} ` : '';
  return `${flag}${name ?? '?'}`;
}
