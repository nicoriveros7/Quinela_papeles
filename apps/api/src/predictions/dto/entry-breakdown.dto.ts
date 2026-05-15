import { MatchStatus } from '@prisma/client';

import { MatchPredictionBreakdown } from '../../scoring/scoring.rules';

export interface MatchQuestionBreakdown {
  questionId: string;
  questionText: string;
  answerLabel: string | null;
  correctAnswerLabel: string | null;
  pointsAwarded: number;
  isScored: boolean;
  isCorrect: boolean | null;
}

export interface MatchBreakdown {
  matchId: string;
  kickoffAt: Date;
  status: MatchStatus;
  homeTeamName: string | null;
  homeTeamCode: string | null;
  homeTeamFlagEmoji: string | null;
  awayTeamName: string | null;
  awayTeamCode: string | null;
  awayTeamFlagEmoji: string | null;
  homeSlotLabel: string | null;
  awaySlotLabel: string | null;
  homeScore: number | null;
  awayScore: number | null;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  pointsAwarded: number;
  breakdown: MatchPredictionBreakdown | null;
  questions: MatchQuestionBreakdown[];
}

export interface TournamentPredictionBreakdown {
  champion: string | null;
  championCode: string | null;
  championFlagEmoji: string | null;
  runnerUp: string | null;
  runnerUpCode: string | null;
  runnerUpFlagEmoji: string | null;
  topScorer: string | null;
  pointsAwarded: number;
  isScored: boolean;
}

export interface EntryBreakdownResponse {
  entryId: string;
  participantName: string;
  displayName: string;
  rank: number | null;
  totalPoints: number;
  summary: {
    matchPoints: number;
    bonusPoints: number;
    tournamentPoints: number;
  };
  matchPredictions: MatchBreakdown[];
  tournamentPrediction: TournamentPredictionBreakdown | null;
}
