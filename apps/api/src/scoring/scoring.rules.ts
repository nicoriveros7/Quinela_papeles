export type MatchScoreConfig = {
  pointsExactScore: number;
  pointsGoalDifference: number;
  pointsWinner: number;
  pointsLoser: number;
  pointsHomeGoals: number;
  pointsAwayGoals: number;
  pointsTotalGoals: number;
};

export type MatchPredictionBreakdown = {
  exactScore: number;
  goalDifference: number;
  winner: number;
  loser: number;
  homeGoals: number;
  awayGoals: number;
  totalGoals: number;
  totalPoints: number;
};

export type ResolvedQuestionPointsInput = {
  pointsOverride: number | null;
  templateDefaultPoints: number | null;
  poolPointsBonusCorrect: number;
  poolPointsConfig: unknown;
};

export function getMatchOutcome(homeScore: number, awayScore: number) {
  if (homeScore > awayScore) {
    return 'HOME';
  }

  if (homeScore < awayScore) {
    return 'AWAY';
  }

  return 'DRAW';
}

export function calculateMatchPredictionPoints(
  predictedHomeScore: number,
  predictedAwayScore: number,
  actualHomeScore: number,
  actualAwayScore: number,
  config: MatchScoreConfig,
) {
  const { breakdown, isExact, isOutcomeCorrect } = calculateMatchPredictionBreakdown(
    predictedHomeScore,
    predictedAwayScore,
    actualHomeScore,
    actualAwayScore,
    config,
  );

  return {
    pointsAwarded: breakdown.totalPoints,
    isExact,
    isOutcomeCorrect,
  };
}

export function calculateMatchPredictionBreakdown(
  predictedHomeScore: number,
  predictedAwayScore: number,
  actualHomeScore: number,
  actualAwayScore: number,
  config: MatchScoreConfig,
): { breakdown: MatchPredictionBreakdown; isExact: boolean; isOutcomeCorrect: boolean } {
  const isExact =
    predictedHomeScore === actualHomeScore && predictedAwayScore === actualAwayScore;

  const predictedGoalDifference = predictedHomeScore - predictedAwayScore;
  const actualGoalDifference = actualHomeScore - actualAwayScore;
  const isGoalDifferenceCorrect = predictedGoalDifference === actualGoalDifference;

  const isHomeGoalsCorrect = predictedHomeScore === actualHomeScore;
  const isAwayGoalsCorrect = predictedAwayScore === actualAwayScore;

  const predictedTotalGoals = predictedHomeScore + predictedAwayScore;
  const actualTotalGoals = actualHomeScore + actualAwayScore;
  const isTotalGoalsCorrect = predictedTotalGoals === actualTotalGoals;

  const predictedOutcome = getMatchOutcome(predictedHomeScore, predictedAwayScore);
  const actualOutcome = getMatchOutcome(actualHomeScore, actualAwayScore);
  const isOutcomeCorrect = predictedOutcome === actualOutcome;

  const hasWinner = actualOutcome !== 'DRAW';
  const isWinnerCorrect = hasWinner && isOutcomeCorrect;
  const isLoserCorrect = hasWinner && isOutcomeCorrect;

  const breakdown: MatchPredictionBreakdown = {
    exactScore: isExact ? config.pointsExactScore : 0,
    goalDifference: isGoalDifferenceCorrect ? config.pointsGoalDifference : 0,
    winner: isWinnerCorrect ? config.pointsWinner : 0,
    loser: isLoserCorrect ? config.pointsLoser : 0,
    homeGoals: isHomeGoalsCorrect ? config.pointsHomeGoals : 0,
    awayGoals: isAwayGoalsCorrect ? config.pointsAwayGoals : 0,
    totalGoals: isTotalGoalsCorrect ? config.pointsTotalGoals : 0,
    totalPoints: 0,
  };

  breakdown.totalPoints =
    breakdown.exactScore +
    breakdown.goalDifference +
    breakdown.winner +
    breakdown.loser +
    breakdown.homeGoals +
    breakdown.awayGoals +
    breakdown.totalGoals;

  return { breakdown, isExact, isOutcomeCorrect };
}

export function resolveQuestionPoints(input: ResolvedQuestionPointsInput) {
  if (typeof input.pointsOverride === 'number') {
    return input.pointsOverride;
  }

  if (typeof input.templateDefaultPoints === 'number') {
    return input.templateDefaultPoints;
  }

  if (typeof input.poolPointsBonusCorrect === 'number') {
    return input.poolPointsBonusCorrect;
  }

  const fallback = extractNumericConfigValue(input.poolPointsConfig, ['bonus', 'default']);
  return fallback ?? 0;
}

export function resolveMatchScoringConfig(
  poolPointsExactScore: number,
  poolPointsMatchOutcome: number,
  poolPointsConfig: unknown,
): MatchScoreConfig {
  const legacyExact = sanitizeNonNegativeInt(poolPointsExactScore);
  const legacyOutcome = sanitizeNonNegativeInt(poolPointsMatchOutcome);

  return {
    pointsExactScore:
      extractNumericConfigValue(poolPointsConfig, ['match', 'exactScore']) ??
      legacyExact ??
      5,
    pointsGoalDifference:
      extractNumericConfigValue(poolPointsConfig, ['match', 'goalDifference']) ??
      3,
    pointsWinner:
      extractNumericConfigValue(poolPointsConfig, ['match', 'winner']) ??
      legacyOutcome ??
      1,
    pointsLoser:
      extractNumericConfigValue(poolPointsConfig, ['match', 'loser']) ??
      1,
    pointsHomeGoals:
      extractNumericConfigValue(poolPointsConfig, ['match', 'homeGoals']) ??
      2,
    pointsAwayGoals:
      extractNumericConfigValue(poolPointsConfig, ['match', 'awayGoals']) ??
      2,
    pointsTotalGoals:
      extractNumericConfigValue(poolPointsConfig, ['match', 'totalGoals']) ??
      1,
  };
}

function sanitizeNonNegativeInt(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    return null;
  }

  return value;
}

function extractNumericConfigValue(config: unknown, path: string[]) {
  let current: unknown = config;

  for (const key of path) {
    if (!current || typeof current !== 'object' || !(key in current)) {
      return null;
    }

    current = (current as Record<string, unknown>)[key];
  }

  return sanitizeNonNegativeInt(current);
}

export type TournamentPredictionScoreConfig = {
  pointsChampion: number;
  pointsRunnerUp: number;
  pointsThirdPlace: number;
  pointsTopScorer: number;
  pointsGoldenBall: number;
  pointsGoldenGlove: number;
  pointsBestThirdsExact: number;
  pointsBestThirdsPartial: number;
};

export const DEFAULT_TOURNAMENT_PREDICTION_CONFIG: TournamentPredictionScoreConfig = {
  pointsChampion: 15,
  pointsRunnerUp: 15,
  pointsThirdPlace: 15,
  pointsTopScorer: 10,
  pointsGoldenBall: 10,
  pointsGoldenGlove: 10,
  pointsBestThirdsExact: 20,
  pointsBestThirdsPartial: 10,
};

export function calculateBestThirdsPoints(
  predictedIds: string[],
  actualIds: string[],
  config: Pick<TournamentPredictionScoreConfig, 'pointsBestThirdsExact' | 'pointsBestThirdsPartial'>,
): number {
  if (actualIds.length === 0) return 0;
  const actualSet = new Set(actualIds);
  const hits = predictedIds.filter((id) => actualSet.has(id)).length;
  if (hits >= 8) return config.pointsBestThirdsExact;
  if (hits >= 4) return config.pointsBestThirdsPartial;
  return 0;
}

export function calculateTournamentPredictionPoints(
  predicted: {
    championTeamId: string | null;
    runnerUpTeamId: string | null;
    thirdPlaceTeamId: string | null;
    topScorerPlayerId: string | null;
    goldenBallPlayerId: string | null;
    goldenGlovePlayerId: string | null;
    bestThirdsTeamIds: string[];
  },
  actual: {
    championTeamId: string | null;
    runnerUpTeamId: string | null;
    thirdPlaceTeamId: string | null;
    topScorerPlayerId: string | null;
    goldenBallPlayerId: string | null;
    goldenGlovePlayerId: string | null;
    bestThirdsTeamIds: string[];
  },
  config: TournamentPredictionScoreConfig = DEFAULT_TOURNAMENT_PREDICTION_CONFIG,
): number {
  let points = 0;
  if (actual.championTeamId && predicted.championTeamId === actual.championTeamId) points += config.pointsChampion;
  if (actual.runnerUpTeamId && predicted.runnerUpTeamId === actual.runnerUpTeamId) points += config.pointsRunnerUp;
  if (actual.thirdPlaceTeamId && predicted.thirdPlaceTeamId === actual.thirdPlaceTeamId) points += config.pointsThirdPlace;
  if (actual.topScorerPlayerId && predicted.topScorerPlayerId === actual.topScorerPlayerId) points += config.pointsTopScorer;
  if (actual.goldenBallPlayerId && predicted.goldenBallPlayerId === actual.goldenBallPlayerId) points += config.pointsGoldenBall;
  if (actual.goldenGlovePlayerId && predicted.goldenGlovePlayerId === actual.goldenGlovePlayerId) points += config.pointsGoldenGlove;
  if (actual.bestThirdsTeamIds.length > 0) {
    points += calculateBestThirdsPoints(predicted.bestThirdsTeamIds, actual.bestThirdsTeamIds, config);
  }
  return points;
}
