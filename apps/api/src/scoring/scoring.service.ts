import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchStatus, PoolMemberStatus, PoolRole, Prisma, SystemRole } from '@prisma/client';

import { JwtUserPayload } from '../auth/types/jwt-user-payload.type';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculateMatchPredictionPoints,
  resolveMatchScoringConfig,
  resolveQuestionPoints,
} from './scoring.rules';

type LeaderboardRow = {
  rank: number;
  entryId: string;
  entryName: string | null;
  userId: string;
  userDisplayName: string;
  totalPoints: number;
  matchPredictionsScored: number;
  questionPredictionsScored: number;
};

@Injectable()
export class ScoringService {
  constructor(private readonly prisma: PrismaService) {}

  async getPoolLeaderboard(poolId: string, user: JwtUserPayload) {
    await this.ensureActiveMembership(poolId, user.sub);
    return this.readLeaderboard(poolId);
  }

  async recalculatePool(poolId: string, user: JwtUserPayload) {
    await this.ensurePoolAdminOrOwner(poolId, user);

    const pool = await this.prisma.pool.findUnique({
      where: { id: poolId },
      select: {
        id: true,
        tournamentId: true,
      },
    });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    const finishedMatches = await this.prisma.match.findMany({
      where: {
        tournamentId: pool.tournamentId,
        status: MatchStatus.FINISHED,
        homeScore: { not: null },
        awayScore: { not: null },
      },
      select: { id: true },
    });

    for (const match of finishedMatches) {
      await this.recalculateMatchPredictions(poolId, match.id, user, true);
    }

    const resolvedQuestions = await this.prisma.matchQuestion.findMany({
      where: {
        match: { tournamentId: pool.tournamentId },
        isResolved: true,
      },
      select: { id: true },
    });

    for (const question of resolvedQuestions) {
      await this.recalculateQuestionPredictions(poolId, question.id, user, true);
    }

    return this.readLeaderboard(poolId);
  }

  async recalculateMatchPredictions(
    poolId: string,
    matchId: string,
    user: JwtUserPayload,
    skipAuth = false,
  ) {
    if (!skipAuth) {
      await this.ensurePoolAdminOrOwner(poolId, user);
    }

    const pool = await this.prisma.pool.findUnique({
      where: { id: poolId },
      select: {
        id: true,
        tournamentId: true,
        pointsExactScore: true,
        pointsMatchOutcome: true,
        pointsConfig: true,
      },
    });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        tournamentId: true,
        status: true,
        homeScore: true,
        awayScore: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.tournamentId !== pool.tournamentId) {
      throw new BadRequestException('Match does not belong to pool tournament');
    }

    if (match.status !== MatchStatus.FINISHED) {
      throw new ConflictException('Match must be FINISHED before scoring predictions');
    }

    if (match.homeScore === null || match.awayScore === null) {
      throw new ConflictException('Match score is incomplete');
    }

    const scoringConfig = resolveMatchScoringConfig(
      pool.pointsExactScore,
      pool.pointsMatchOutcome,
      pool.pointsConfig,
    );

    const predictions = await this.prisma.matchPrediction.findMany({
      where: {
        matchId,
        poolEntry: {
          poolId,
        },
      },
      select: {
        id: true,
        predictedHomeScore: true,
        predictedAwayScore: true,
      },
    });

    const now = new Date();

    await this.prisma.$transaction(
      predictions.map((prediction) => {
        const calculation = calculateMatchPredictionPoints(
          prediction.predictedHomeScore,
          prediction.predictedAwayScore,
          match.homeScore!,
          match.awayScore!,
          scoringConfig,
        );

        return this.prisma.matchPrediction.update({
          where: { id: prediction.id },
          data: {
            pointsAwarded: calculation.pointsAwarded,
            isScored: true,
            scoredAt: now,
          },
        });
      }),
    );

    await this.recalculatePoolEntryTotals(poolId);

    return {
      poolId,
      matchId,
      processedPredictions: predictions.length,
      scoringConfig,
    };
  }

  async recalculateQuestionPredictions(
    poolId: string,
    questionId: string,
    user: JwtUserPayload,
    skipAuth = false,
  ) {
    if (!skipAuth) {
      await this.ensurePoolAdminOrOwner(poolId, user);
    }

    const pool = await this.prisma.pool.findUnique({
      where: { id: poolId },
      select: {
        id: true,
        tournamentId: true,
        pointsBonusCorrect: true,
        pointsConfig: true,
      },
    });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    const question = await this.prisma.matchQuestion.findUnique({
      where: { id: questionId },
      include: {
        template: {
          select: {
            defaultPoints: true,
          },
        },
        match: {
          select: {
            id: true,
            tournamentId: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Match question not found');
    }

    if (question.match.tournamentId !== pool.tournamentId) {
      throw new BadRequestException('Question does not belong to pool tournament');
    }

    if (!question.isResolved) {
      throw new ConflictException('Question must be resolved before scoring predictions');
    }

    if (!question.correctOptionId) {
      throw new ConflictException('Resolved question has no correct option configured');
    }

    const pointsForCorrect = resolveQuestionPoints({
      pointsOverride: question.pointsOverride,
      templateDefaultPoints: question.template?.defaultPoints ?? null,
      poolPointsBonusCorrect: pool.pointsBonusCorrect,
      poolPointsConfig: pool.pointsConfig,
    });

    const predictions = await this.prisma.matchQuestionPrediction.findMany({
      where: {
        matchQuestionId: questionId,
        poolEntry: {
          poolId,
        },
      },
      select: {
        id: true,
        selectedOptionId: true,
      },
    });

    const now = new Date();

    await this.prisma.$transaction(
      predictions.map((prediction) => {
        const pointsAwarded =
          prediction.selectedOptionId && prediction.selectedOptionId === question.correctOptionId
            ? pointsForCorrect
            : 0;

        return this.prisma.matchQuestionPrediction.update({
          where: { id: prediction.id },
          data: {
            pointsAwarded,
            isScored: true,
            scoredAt: now,
          },
        });
      }),
    );

    await this.recalculatePoolEntryTotals(poolId);

    return {
      poolId,
      questionId,
      processedPredictions: predictions.length,
      pointsForCorrect,
    };
  }

  private async ensurePoolAdminOrOwner(poolId: string, user: JwtUserPayload) {
    if (user.role === SystemRole.ADMIN || user.role === SystemRole.SUPER_ADMIN) {
      return null;
    }

    const membership = await this.ensureActiveMembership(poolId, user.sub);
    if (membership.role !== PoolRole.OWNER && membership.role !== PoolRole.ADMIN) {
      throw new ForbiddenException('Only pool OWNER or ADMIN can run scoring');
    }

    return membership;
  }

  private async ensureActiveMembership(poolId: string, userId: string) {
    const membership = await this.prisma.poolMember.findUnique({
      where: {
        poolId_userId: {
          poolId,
          userId,
        },
      },
      select: {
        id: true,
        role: true,
        status: true,
      },
    });

    if (!membership || membership.status !== PoolMemberStatus.ACTIVE) {
      throw new ForbiddenException('Active pool membership is required');
    }

    return membership;
  }

  private async recalculatePoolEntryTotals(poolId: string) {
    const [entries, matchSums, questionSums] = await Promise.all([
      this.prisma.poolEntry.findMany({
        where: { poolId },
        select: {
          id: true,
          createdAt: true,
        },
      }),
      this.prisma.matchPrediction.groupBy({
        by: ['poolEntryId'],
        where: {
          poolEntry: { poolId },
        },
        _sum: {
          pointsAwarded: true,
        },
      }),
      this.prisma.matchQuestionPrediction.groupBy({
        by: ['poolEntryId'],
        where: {
          poolEntry: { poolId },
        },
        _sum: {
          pointsAwarded: true,
        },
      }),
    ]);

    const matchPointsByEntry = new Map(
      matchSums.map((row) => [row.poolEntryId, row._sum.pointsAwarded ?? 0]),
    );
    const questionPointsByEntry = new Map(
      questionSums.map((row) => [row.poolEntryId, row._sum.pointsAwarded ?? 0]),
    );

    const totals = entries.map((entry) => {
      const matchPoints = matchPointsByEntry.get(entry.id) ?? 0;
      const questionPoints = questionPointsByEntry.get(entry.id) ?? 0;
      return {
        entryId: entry.id,
        createdAt: entry.createdAt,
        totalPoints: matchPoints + questionPoints,
      };
    });

    totals.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }

      if (a.createdAt.getTime() !== b.createdAt.getTime()) {
        return a.createdAt.getTime() - b.createdAt.getTime();
      }

      return a.entryId.localeCompare(b.entryId);
    });

    const updates: Prisma.PrismaPromise<unknown>[] = [];

    for (let index = 0; index < totals.length; index += 1) {
      const row = totals[index];
      updates.push(
        this.prisma.poolEntry.update({
          where: { id: row.entryId },
          data: {
            totalPoints: row.totalPoints,
            rank: index + 1,
          },
        }),
      );
    }

    if (updates.length > 0) {
      await this.prisma.$transaction(updates);
    }
  }

  private async readLeaderboard(poolId: string) {
    const [entries, matchScoredByEntry, questionScoredByEntry] = await Promise.all([
      this.prisma.poolEntry.findMany({
        where: { poolId },
        orderBy: [{ totalPoints: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          entryName: true,
          rank: true,
          totalPoints: true,
          userId: true,
          user: {
            select: {
              displayName: true,
            },
          },
        },
      }),
      this.prisma.matchPrediction.groupBy({
        by: ['poolEntryId'],
        where: {
          isScored: true,
          poolEntry: { poolId },
        },
        _count: {
          _all: true,
        },
      }),
      this.prisma.matchQuestionPrediction.groupBy({
        by: ['poolEntryId'],
        where: {
          isScored: true,
          poolEntry: { poolId },
        },
        _count: {
          _all: true,
        },
      }),
    ]);

    const matchCountByEntry = new Map(matchScoredByEntry.map((row) => [row.poolEntryId, row._count._all]));
    const questionCountByEntry = new Map(
      questionScoredByEntry.map((row) => [row.poolEntryId, row._count._all]),
    );

    const leaderboard: LeaderboardRow[] = entries.map((entry, index) => ({
      rank: entry.rank ?? index + 1,
      entryId: entry.id,
      entryName: entry.entryName,
      userId: entry.userId,
      userDisplayName: entry.user.displayName,
      totalPoints: entry.totalPoints,
      matchPredictionsScored: matchCountByEntry.get(entry.id) ?? 0,
      questionPredictionsScored: questionCountByEntry.get(entry.id) ?? 0,
    }));

    return {
      poolId,
      generatedAt: new Date(),
      leaderboard,
    };
  }
}
