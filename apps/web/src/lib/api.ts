import {
  AuthResponse,
  LeaderboardResponse,
  MatchPredictionsBundle,
  PoolDetail,
  PoolEntry,
  PoolMatchesResponse,
  PoolSummary,
  PublicUser,
  ApiErrorShape,
} from '@/types/api';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseError(response: Response): Promise<never> {
  let message = `Request failed with status ${response.status}`;

  try {
    const payload = (await response.json()) as ApiErrorShape;
    const rawMessage = payload.message;
    if (Array.isArray(rawMessage)) {
      message = rawMessage.join(', ');
    } else if (typeof rawMessage === 'string') {
      message = rawMessage;
    } else if (typeof payload.error === 'string') {
      message = payload.error;
    }
  } catch {
    // Keep fallback message.
  }

  throw new ApiError(message, response.status);
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set('content-type', 'application/json');
  if (token) {
    headers.set('authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  if (!response.ok) {
    return parseError(response);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export const api = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, displayName: string, password: string) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, displayName, password }),
    }),

  me: (token: string) => request<PublicUser>('/users/me', { method: 'GET' }, token),

  listPools: (token: string) => request<PoolSummary[]>('/pools', { method: 'GET' }, token),

  getPool: (poolId: string, token: string) =>
    request<PoolDetail>(`/pools/${poolId}`, { method: 'GET' }, token),

  joinPool: (joinCode: string, token: string) =>
    request(`/pools/join`, {
      method: 'POST',
      body: JSON.stringify({ joinCode }),
    }, token),

  createPool: (
    payload: {
      name: string;
      slug: string;
      tournamentId: string;
      description?: string;
      joinCode?: string;
      maxEntriesPerMember?: number;
    },
    token: string,
  ) =>
    request<PoolDetail>(
      '/pools',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      token,
    ),

  createEntry: (poolId: string, entryName: string, token: string) =>
    request<PoolEntry>(
      `/pools/${poolId}/entries`,
      {
        method: 'POST',
        body: JSON.stringify({ entryName }),
      },
      token,
    ),

  listMyEntries: (poolId: string, token: string) =>
    request<PoolEntry[]>(`/pools/${poolId}/entries/mine`, { method: 'GET' }, token),

  listPoolMatches: (poolId: string, token: string) =>
    request<PoolMatchesResponse>(`/pools/${poolId}/matches`, { method: 'GET' }, token),

  getEntryMatchPredictions: (
    poolId: string,
    entryId: string,
    matchId: string,
    token: string,
  ) =>
    request<MatchPredictionsBundle>(
      `/pools/${poolId}/entries/${entryId}/predictions/matches/${matchId}`,
      { method: 'GET' },
      token,
    ),

  upsertMatchPrediction: (
    poolId: string,
    entryId: string,
    matchId: string,
    predictedHomeScore: number,
    predictedAwayScore: number,
    token: string,
  ) =>
    request(
      `/pools/${poolId}/entries/${entryId}/predictions/matches/${matchId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ predictedHomeScore, predictedAwayScore }),
      },
      token,
    ),

  upsertQuestionPrediction: (
    poolId: string,
    entryId: string,
    questionId: string,
    payload: {
      selectedOptionId?: string;
      selectedBoolean?: boolean;
      selectedTeamId?: string;
      selectedTimeRangeKey?: string;
    },
    token: string,
  ) =>
    request(
      `/pools/${poolId}/entries/${entryId}/predictions/questions/${questionId}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
      token,
    ),

  getLeaderboard: (poolId: string, token: string) =>
    request<LeaderboardResponse>(`/pools/${poolId}/leaderboard`, { method: 'GET' }, token),
};
