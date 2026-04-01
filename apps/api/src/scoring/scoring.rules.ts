export type MatchScoreConfig = {
  pointsExactScore: number;
  pointsMatchOutcome: number;
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
  const isExact =
    predictedHomeScore === actualHomeScore && predictedAwayScore === actualAwayScore;

  if (isExact) {
    return {
      pointsAwarded: config.pointsExactScore,
      isExact,
      isOutcomeCorrect: true,
    };
  }

  const predictedOutcome = getMatchOutcome(predictedHomeScore, predictedAwayScore);
  const actualOutcome = getMatchOutcome(actualHomeScore, actualAwayScore);
  const isOutcomeCorrect = predictedOutcome === actualOutcome;

  return {
    pointsAwarded: isOutcomeCorrect ? config.pointsMatchOutcome : 0,
    isExact,
    isOutcomeCorrect,
  };
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
  return {
    pointsExactScore:
      sanitizeNonNegativeInt(poolPointsExactScore) ??
      extractNumericConfigValue(poolPointsConfig, ['match', 'exactScore']) ??
      3,
    pointsMatchOutcome:
      sanitizeNonNegativeInt(poolPointsMatchOutcome) ??
      extractNumericConfigValue(poolPointsConfig, ['match', 'outcome']) ??
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
