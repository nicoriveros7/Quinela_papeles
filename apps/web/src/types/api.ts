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
  maxEntriesPerMember: number;
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

export type MatchQuestionOption = {
  id: string;
  key: string;
  label: string;
  teamId: string | null;
};

export type PoolMatchQuestion = {
  id: string;
  questionText: string;
  answerType: 'BOOLEAN' | 'SINGLE_CHOICE' | 'TEAM_PICK' | 'TIME_RANGE';
  isResolved: boolean;
  pointsOverride: number | null;
  lockAt: string | null;
  options: MatchQuestionOption[];
};

export type PoolMatch = {
  id: string;
  stage: string;
  roundLabel: string | null;
  matchNumber: number | null;
  kickoffAt: string;
  status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'POSTPONED' | 'CANCELLED';
  homeScore: number | null;
  awayScore: number | null;
  homeTournamentTeam: { team: { id: string; name: string; code: string } };
  awayTournamentTeam: { team: { id: string; name: string; code: string } };
  questions: PoolMatchQuestion[];
};

export type PoolMatchesResponse = {
  poolId: string;
  matches: PoolMatch[];
};

export type MatchPrediction = {
  id: string;
  poolEntryId: string;
  matchId: string;
  predictedHomeScore: number;
  predictedAwayScore: number;
  pointsAwarded: number;
  isScored: boolean;
  scoredAt: string | null;
};

export type MatchQuestionPrediction = {
  id: string;
  poolEntryId: string;
  matchQuestionId: string;
  selectedOptionId: string | null;
  selectedBoolean: boolean | null;
  selectedTeamId: string | null;
  selectedTimeRangeKey: string | null;
  pointsAwarded: number;
  isScored: boolean;
  scoredAt: string | null;
};

export type MatchPredictionsBundle = {
  poolId: string;
  entryId: string;
  match: {
    id: string;
    kickoffAt: string;
    status: string;
  };
  matchPrediction: MatchPrediction | null;
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

export type ApiErrorShape = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};
