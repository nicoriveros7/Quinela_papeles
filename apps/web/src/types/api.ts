export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  systemRole: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuthResponse = {
  accessToken: string;
  user: PublicUser;
};

export type PoolSummary = {
  id: string;
  name: string;
  slug: string;
  joinCode: string | null;
  status: string;
  totalPoints?: number;
  tournament?: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
  _count?: {
    members: number;
    entries: number;
  };
};

export type PoolDetail = PoolSummary & {
  description: string | null;
  maxEntriesPerMember: 1;
  lockMinutesBeforeKickoff: number;
  pointsExactScore: number;
  pointsMatchOutcome: number;
  pointsBonusCorrect: number;
  membership?: {
    role: 'OWNER' | 'ADMIN' | 'MEMBER';
    status: string;
  };
};

export type PoolEntry = {
  id: string;
  poolId: string;
  userId: string;
  entryNumber: number;
  entryName: string | null;
  totalPoints: number;
  rank: number | null;
  status: string;
};

export type MatchQuestionOptionPlayer = {
  fullName: string;
  shortName: string | null;
  nameOnShirt: string | null;
  firstNames: string | null;
  lastNames: string | null;
  preferredPosition: string | null;
  shirtNumber: number | null;
  position: string | null;
  teamCode: string | null;
  teamName: string | null;
  teamFlagEmoji: string | null;
};

export type MatchQuestionOption = {
  id: string;
  key: string;
  label: string;
  teamId: string | null;
  playerId: string | null;
  player: MatchQuestionOptionPlayer | null;
};

export type PoolMatchQuestion = {
  id: string;
  questionText: string;
  answerType: 'BOOLEAN' | 'SINGLE_CHOICE' | 'TEAM_PICK' | 'PLAYER_PICK' | 'TIME_RANGE';
  isResolved: boolean;
  correctOptionId: string | null;
  pointsOverride: number | null;
  lockAt: string | null;
  options: MatchQuestionOption[];
};

export type PoolMatch = {
  id: string;
  stage: string;
  roundLabel: string | null;
  matchNumber: number | null;
  group: { code: string } | null;
  homeSlotLabel: string | null;
  awaySlotLabel: string | null;
  kickoffAt: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  homeScore: number | null;
  awayScore: number | null;
  homeTournamentTeam: { team: { id: string; name: string; code: string; countryCode: string | null; flagEmoji: string | null } } | null;
  awayTournamentTeam: { team: { id: string; name: string; code: string; countryCode: string | null; flagEmoji: string | null } } | null;
  questions: PoolMatchQuestion[];
};

export type PoolMatchesResponse = {
  poolId: string;
  matches: PoolMatch[];
};

export type PoolMatchListItem = Omit<PoolMatch, 'questions'>;

export type PoolMatchListResponse = {
  poolId: string;
  matches: PoolMatchListItem[];
};

export type MatchPrediction = {
  id: string;
  poolEntryId: string;
  matchId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  pointsAwarded: number;
  isScored: boolean;
  isJoker: boolean;
  scoredAt: string | null;
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

export type MatchQuestionPrediction = {
  id: string;
  poolEntryId: string;
  matchQuestionId: string;
  selectedOptionId: string | null;
  selectedBoolean: boolean | null;
  selectedTeamId: string | null;
  selectedPlayerId: string | null;
  selectedTimeRangeKey: string | null;
  pointsAwarded: number;
  isScored: boolean;
  scoredAt: string | null;
};

export type MatchPredictionsBundle = {
  poolId: string;
  entryId: string;
  viewer?: {
    isOwner: boolean;
  };
  match: {
    id: string;
    kickoffAt: string;
    status: string;
    stage: string;
    roundLabel: string | null;
    homeScore: number | null;
    awayScore: number | null;
  };
  matchPrediction: MatchPrediction | null;
  matchPredictionBreakdown: MatchPredictionBreakdown | null;
  questions: PoolMatchQuestion[];
  questionPredictions: MatchQuestionPrediction[];
};

export type LeaderboardRow = {
  rank: number;
  entryId: string;
  entryName: string | null;
  userId: string;
  userDisplayName: string;
  totalPoints: number;
  matchPredictionsScored: number;
  questionPredictionsScored: number;
};

export type LeaderboardResponse = {
  poolId: string;
  generatedAt: string;
  leaderboard: LeaderboardRow[];
};

export type TournamentTeamOption = {
  id: string;
  team: { id: string; name: string; code: string; countryCode: string | null; flagEmoji: string | null };
};

export type TournamentPlayerOption = {
  id: string;
  isGoalkeeper: boolean;
  player: { id: string; fullName: string; shortName: string | null; nameOnShirt: string | null; firstNames: string | null; lastNames: string | null; nationalityCode: string | null };
};

export type TournamentPrediction = {
  id: string;
  poolEntryId: string;
  tournamentId: string;
  championTournamentTeamId: string | null;
  runnerUpTournamentTeamId: string | null;
  thirdPlaceTournamentTeamId: string | null;
  topScorerTournamentPlayerId: string | null;
  goldenBallTournamentPlayerId: string | null;
  goldenGloveTournamentPlayerId: string | null;
  bestThirdsTeamIds: string[] | null;
  pointsAwarded: number;
  isLocked: boolean;
  isScored: boolean;
  scoredAt: string | null;
  champion: TournamentTeamOption | null;
  runnerUp: TournamentTeamOption | null;
  thirdPlace: TournamentTeamOption | null;
  topScorer: TournamentPlayerOption | null;
  goldenBall: TournamentPlayerOption | null;
  goldenGlove: TournamentPlayerOption | null;
  fieldBreakdown: {
    champion: TournamentFieldScore;
    runnerUp: TournamentFieldScore;
    thirdPlace: TournamentFieldScore;
    topScorer: TournamentFieldScore;
    goldenBall: TournamentFieldScore;
    goldenGlove: TournamentFieldScore;
    bestThirds: TournamentFieldScore & { hits: number; total: number };
  } | null;
};

export type TournamentPredictionLockInfo = {
  isLocked: boolean;
  lockedManually: boolean;
  lockAt: string | null;
};

export type TournamentPredictionResponse = {
  prediction: TournamentPrediction | null;
  tournamentTeams: TournamentTeamOption[];
  tournamentPlayers: TournamentPlayerOption[];
  lockInfo: TournamentPredictionLockInfo;
};

export type WorldCupMainPool = {
  pool: PoolDetail & {
    owner: { id: string; email: string; displayName: string };
  };
  mainEntry: PoolEntry;
  entries: PoolEntry[];
};

export type ApiErrorShape = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

export type EntryPredictionSummaryItem = {
  matchId: string;
  hasPrediction: boolean;
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  isJoker: boolean;
  answeredQuestions: number;
  totalQuestions: number;
  predictionStatus: 'NONE' | 'PARTIAL' | 'COMPLETE';
};

/** Keyed by matchId */
export type EntryPredictionSummaryResponse = Record<string, EntryPredictionSummaryItem>;

export type AdminTournament = {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  status: string;
  startDate: string;
  endDate: string;
  _count: {
    matches: number;
    pools: number;
  };
};

export type AdminPool = {
  id: string;
  name: string;
  slug: string;
  status: string;
  joinCode: string | null;
  tournamentId: string;
  tournament: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
  _count: {
    members: number;
    entries: number;
  };
};

export type AdminMatch = {
  id: string;
  tournamentId: string;
  stage: string;
  roundLabel: string | null;
  matchNumber: number | null;
  group: { code: string } | null;
  homeSlotLabel: string | null;
  awaySlotLabel: string | null;
  kickoffAt: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  homeScore: number | null;
  awayScore: number | null;
  homeTournamentTeam: { id: string; team: { id: string; name: string; code: string; flagEmoji: string | null } } | null;
  awayTournamentTeam: { id: string; team: { id: string; name: string; code: string; flagEmoji: string | null } } | null;
  _count: {
    questions: number;
    predictions: number;
  };
};

export type AdminTournamentMatchesResponse = {
  tournament: {
    id: string;
    name: string;
  };
  matches: AdminMatch[];
};

export type AdminPoolMatchesResponse = {
  pool: {
    id: string;
    name: string;
    tournamentId: string;
  };
  tournament: {
    id: string;
    name: string;
  };
  matches: AdminMatch[];
};

export type AdminMatchQuestion = {
  id: string;
  key: string;
  questionText: string;
  answerType: 'BOOLEAN' | 'SINGLE_CHOICE' | 'TEAM_PICK' | 'PLAYER_PICK' | 'TIME_RANGE';
  pointsOverride: number | null;
  isPublished: boolean;
  isResolved: boolean;
  lockAt: string | null;
  resolvedAt: string | null;
  correctOptionId: string | null;
  options: Array<{
    id: string;
    key: string;
    label: string;
    teamId: string | null;
    playerId: string | null;
    player: MatchQuestionOptionPlayer | null;
  }>;
};

export type AdminMatchQuestionsResponse = {
  match: {
    id: string;
    kickoffAt: string;
    status: string;
    homeTournamentTeam: { team: { name: string; code: string; flagEmoji: string | null } } | null;
    awayTournamentTeam: { team: { name: string; code: string; flagEmoji: string | null } } | null;
  };
  questions: AdminMatchQuestion[];
};

export type AdminMatchPlayerPoolResponse = {
  matchId: string;
  tournamentId: string;
  teams: Array<{
    tournamentTeamId: string;
    teamId: string;
    teamCode: string;
    teamName: string;
    isMatchParticipant: boolean;
    matchSide: 'HOME' | 'AWAY' | null;
    players: Array<{
      playerId: string;
      fullName: string;
      shortName: string | null;
      firstNames: string | null;
      lastNames: string | null;
      shirtNumber: number | null;
      position: string | null;
      preferredPosition: string | null;
      squadStatus: 'PROVISIONAL' | 'FINAL' | 'WITHDRAWN' | 'REPLACED';
      isGoalkeeper: boolean;
    }>;
  }>;
};

export type MatchQuestionBreakdown = {
  questionId: string;
  questionText: string;
  answerLabel: string | null;
  correctAnswerLabel: string | null;
  pointsAwarded: number;
  isScored: boolean;
  isCorrect: boolean | null;
};

export type JokerBucket =
  | 'GROUP_MATCHDAY_1'
  | 'GROUP_MATCHDAY_2'
  | 'GROUP_MATCHDAY_3'
  | 'ROUND_OF_32'
  | 'ROUND_OF_16'
  | 'QUARTER_FINAL'
  | 'SEMI_FINAL'
  | 'FINAL_THIRD_PLACE';

export type MatchBreakdown = {
  matchId: string;
  kickoffAt: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
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
  visibility: 'VISIBLE' | 'HIDDEN_UNTIL_LOCKED';
  predictedHomeScore: number | null;
  predictedAwayScore: number | null;
  pointsAwarded: number;
  isJoker: boolean;
  jokerBucket: JokerBucket | null;
  jokerBonusPoints: number;
  breakdown: MatchPredictionBreakdown | null;
  questions: MatchQuestionBreakdown[];
};

export type TournamentFieldScore = {
  points: number;
  isCorrect: boolean | null;
};

export type TournamentPredictionBreakdown = {
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
  fieldBreakdown: {
    champion: TournamentFieldScore;
    runnerUp: TournamentFieldScore;
    thirdPlace: TournamentFieldScore;
    topScorer: TournamentFieldScore;
    goldenBall: TournamentFieldScore;
    goldenGlove: TournamentFieldScore;
    bestThirds: TournamentFieldScore & { hits: number; total: number };
  } | null;
};

export type AdminTournamentPredictionLock = {
  tournamentId: string;
  isLocked: boolean;
  lockedManually: boolean;
  lockAt: string | null;
};

export type AdminTournamentPlayer = {
  id: string; // TournamentPlayer.id
  fullName: string;
  shortName: string | null;
  firstNames: string | null;
  lastNames: string | null;
  isGoalkeeper: boolean;
  position: string | null;
  shirtNumber: number | null;
  teamCode: string | null;
  teamName: string | null;
  teamFlagEmoji: string | null;
};

export type AdminTournamentActualResults = {
  id: string;
  actualChampionTournamentTeamId: string | null;
  actualRunnerUpTournamentTeamId: string | null;
  actualThirdPlaceTournamentTeamId: string | null;
  actualTopScorerTournamentPlayerId: string | null;
  actualGoldenBallTournamentPlayerId: string | null;
  actualGoldenGloveTournamentPlayerId: string | null;
  actualBestThirdsTeamIds: string[] | null;
};

export type EntryBreakdownResponse = {
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
};

export type CreateAdminQuestionPayload = {
  key?: string;
  questionText: string;
  answerType: 'BOOLEAN' | 'SINGLE_CHOICE' | 'TEAM_PICK' | 'PLAYER_PICK' | 'TIME_RANGE';
  pointsOverride?: number;
  lockAt?: string;
  isPublished?: boolean;
  options?: Array<{
    key: string;
    label: string;
    teamId?: string;
    playerId?: string;
  }>;
};
