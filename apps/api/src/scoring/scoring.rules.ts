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
