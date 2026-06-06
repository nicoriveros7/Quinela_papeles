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

export type MatchBreakdownVisibility = 'VISIBLE' | 'HIDDEN_UNTIL_LOCKED';

export interface MatchBreakdown {
  matchId: string;
  kickoffAt: Date;
  status: MatchStatus;
  stage: string;
  roundLabel: string | null;
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
  visibility: MatchBreakdownVisibility;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  pointsAwarded: number;
  isJoker: boolean;
  jokerBucket: 'GROUP_MATCHDAY_1' | 'GROUP_MATCHDAY_2' | 'GROUP_MATCHDAY_3' | 'KNOCKOUT' | null;
  jokerBonusPoints: number;
  breakdown: MatchPredictionBreakdown | null;
  questions: MatchQuestionBreakdown[];
}

export interface TournamentFieldScore {
  points: number;
  isCorrect: boolean | null; // null = actual result not set yet
}

export interface TournamentFieldBreakdown {
  champion: TournamentFieldScore;
  runnerUp: TournamentFieldScore;
  thirdPlace: TournamentFieldScore;
  topScorer: TournamentFieldScore;
  goldenBall: TournamentFieldScore;
  goldenGlove: TournamentFieldScore;
  bestThirds: TournamentFieldScore & { hits: number; total: number };
}

export interface TournamentPredictionBreakdown {
  champion: string | null;
  championCode: string | null;
  championFlagEmoji: string | null;
  runnerUp: string | null;
  runnerUpCode: string | null;
  runnerUpFlagEmoji: string | null;
  thirdPlace: string | null;
  thirdPlaceCode: string | null;
  thirdPlaceFlagEmoji: string | null;
  topScorer: string | null;
  goldenBall: string | null;
  goldenGlove: string | null;
  bestThirds: { name: string; code: string; flagEmoji: string | null }[] | null;
  pointsAwarded: number;
  isScored: boolean;
  fieldBreakdown: TournamentFieldBreakdown | null;
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
    jokerPoints: number;
  };
  matchPredictions: MatchBreakdown[];
  tournamentPrediction: TournamentPredictionBreakdown | null;
  tournamentPredictionHidden: boolean;
}
