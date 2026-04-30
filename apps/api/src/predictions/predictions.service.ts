import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchStatus, PoolMemberStatus, QuestionAnswerType } from '@prisma/client';

import { JwtUserPayload } from '../auth/types/jwt-user-payload.type';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertMatchPredictionDto } from './dto/upsert-match-prediction.dto';
import { UpsertMatchQuestionPredictionDto } from './dto/upsert-match-question-prediction.dto';
import { calculateMatchPredictionBreakdown, resolveMatchScoringConfig } from '../scoring/scoring.rules';

@Injectable()
export class PredictionsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertMatchPrediction(
    poolId: string,
    entryId: string,
    matchId: string,
    user: JwtUserPayload,
    dto: UpsertMatchPredictionDto,
  ) {
    const entryContext = await this.getEntryContext(poolId, entryId, user.sub);
    const match = await this.getMatchInPoolTournament(entryContext.pool.tournamentId, matchId);

    this.assertMatchEditable(match.kickoffAt, match.status, entryContext.pool.lockMinutesBeforeKickoff);

    return this.prisma.matchPrediction.upsert({
      where: {
        poolEntryId_matchId: {
          poolEntryId: entryId,
          matchId,
        },
      },
      update: {
        predictedHomeScore: dto.predictedHomeScore,
        predictedAwayScore: dto.predictedAwayScore,
        isScored: false,
        pointsAwarded: 0,
        scoredAt: null,
      },
      create: {
        poolEntryId: entryId,
        matchId,
        predictedHomeScore: dto.predictedHomeScore,
        predictedAwayScore: dto.predictedAwayScore,
      },
    });
  }

  async upsertMatchQuestionPrediction(
    poolId: string,
    entryId: string,
    questionId: string,
    user: JwtUserPayload,
    dto: UpsertMatchQuestionPredictionDto,
  ) {
    const entryContext = await this.getEntryContext(poolId, entryId, user.sub);

    const question = await this.prisma.matchQuestion.findUnique({
      where: { id: questionId },
      include: {
        match: {
          select: {
            id: true,
            tournamentId: true,
            kickoffAt: true,
            status: true,
          },
        },
        options: {
          where: { isActive: true },
          select: {
            id: true,
            key: true,
            teamId: true,
            playerId: true,
            optionConfig: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Match question not found');
    }

    if (question.match.tournamentId !== entryContext.pool.tournamentId) {
      throw new BadRequestException('Question does not belong to the pool tournament');
    }

    if (!question.isPublished) {
      throw new ConflictException('Question is not published');
    }

    if (question.isResolved) {
      throw new ConflictException('Question is already resolved');
    }

    this.assertMatchEditable(
      question.lockAt ?? question.match.kickoffAt,
      question.match.status,
      question.lockAt ? 0 : entryContext.pool.lockMinutesBeforeKickoff,
      Boolean(question.lockAt),
    );

    const normalized = this.normalizeQuestionAnswer(question.answerType, dto, question.options);

    return this.prisma.matchQuestionPrediction.upsert({
      where: {
        poolEntryId_matchQuestionId: {
          poolEntryId: entryId,
          matchQuestionId: questionId,
        },
      },
      update: {
        selectedOptionId: normalized.selectedOptionId,
        selectedBoolean: normalized.selectedBoolean,
        selectedTeamId: normalized.selectedTeamId,
        selectedPlayerId: normalized.selectedPlayerId,
        selectedTimeRangeKey: normalized.selectedTimeRangeKey,
        isScored: false,
        pointsAwarded: 0,
        scoredAt: null,
      },
      create: {
        poolEntryId: entryId,
        matchQuestionId: questionId,
        selectedOptionId: normalized.selectedOptionId,
        selectedBoolean: normalized.selectedBoolean,
        selectedTeamId: normalized.selectedTeamId,
        selectedPlayerId: normalized.selectedPlayerId,
        selectedTimeRangeKey: normalized.selectedTimeRangeKey,
      },
    });
  }

  async getEntryMatchPredictions(
    poolId: string,
    entryId: string,
    matchId: string,
    user: JwtUserPayload,
  ) {
    const entryContext = await this.getEntryReadContext(poolId, entryId, user.sub);
    const match = await this.getMatchInPoolTournament(entryContext.pool.tournamentId, matchId);

    const isOwner = entryContext.userId === user.sub;
    if (!isOwner && match.status !== MatchStatus.FINISHED) {
      throw new ForbiddenException('Predictions are available after the match is finished');
    }

    const [matchPrediction, questionPredictions, questions] = await Promise.all([
      this.prisma.matchPrediction.findUnique({
        where: {
          poolEntryId_matchId: {
            poolEntryId: entryId,
            matchId,
          },
        },
      }),
      this.prisma.matchQuestionPrediction.findMany({
        where: {
          poolEntryId: entryId,
          matchQuestion: {
            matchId,
          },
        },
      }),
      this.prisma.matchQuestion.findMany({
        where: {
          matchId,
          isPublished: true,
        },
        include: {
          options: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    let matchPredictionBreakdown = null;
    if (
      matchPrediction &&
      match.status === MatchStatus.FINISHED &&
      match.homeScore !== null &&
      match.awayScore !== null
    ) {
      const scoringConfig = resolveMatchScoringConfig(
        entryContext.pool.pointsExactScore,
        entryContext.pool.pointsMatchOutcome,
        entryContext.pool.pointsConfig,
      );

      matchPredictionBreakdown = calculateMatchPredictionBreakdown(
        matchPrediction.predictedHomeScore,
        matchPrediction.predictedAwayScore,
        match.homeScore,
        match.awayScore,
        scoringConfig,
      ).breakdown;
    }

    return {
      poolId,
      entryId,
      viewer: {
        isOwner,
      },
      match: {
        id: match.id,
        kickoffAt: match.kickoffAt,
        status: match.status,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      },
      matchPrediction,
      matchPredictionBreakdown,
      questions,
      questionPredictions,
    };
  }

  private async getEntryReadContext(poolId: string, entryId: string, userId: string) {
    const entry = await this.prisma.poolEntry.findUnique({
      where: { id: entryId },
      include: {
        pool: {
          select: {
            id: true,
            tournamentId: true,
            lockMinutesBeforeKickoff: true,
            pointsExactScore: true,
            pointsMatchOutcome: true,
            pointsConfig: true,
          },
        },
      },
    });

    if (!entry || entry.poolId !== poolId) {
      throw new NotFoundException('Pool entry not found in provided pool');
    }

    const membership = await this.prisma.poolMember.findUnique({
      where: {
        poolId_userId: {
          poolId,
          userId,
        },
      },
      select: {
        status: true,
      },
    });

    if (!membership || membership.status !== PoolMemberStatus.ACTIVE) {
      throw new ForbiddenException('Active pool membership is required');
    }

    return entry;
  }

  private async getEntryContext(poolId: string, entryId: string, userId: string) {
    const entry = await this.prisma.poolEntry.findUnique({
      where: { id: entryId },
      include: {
        pool: {
          select: {
            id: true,
            tournamentId: true,
            lockMinutesBeforeKickoff: true,
          },
        },
      },
    });

    if (!entry || entry.poolId !== poolId) {
      throw new NotFoundException('Pool entry not found in provided pool');
    }

    if (entry.userId !== userId) {
      throw new ForbiddenException('You can only modify your own entries');
    }

    const membership = await this.prisma.poolMember.findUnique({
      where: {
        poolId_userId: {
          poolId,
          userId,
        },
      },
      select: {
        status: true,
      },
    });

    if (!membership || membership.status !== PoolMemberStatus.ACTIVE) {
      throw new ForbiddenException('Active pool membership is required');
    }

    return entry;
  }

  private async getMatchInPoolTournament(tournamentId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        tournamentId: true,
        kickoffAt: true,
        status: true,
        homeScore: true,
        awayScore: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.tournamentId !== tournamentId) {
      throw new BadRequestException('Match does not belong to pool tournament');
    }

    return match;
  }

  private assertMatchEditable(
    lockBaseDate: Date,
    status: MatchStatus,
    lockMinutesBeforeKickoff: number,
    isQuestionLockDate = false,
  ) {
    if (status !== MatchStatus.SCHEDULED) {
      throw new ConflictException('Predictions are locked because the match is no longer scheduled');
    }

    const lockAt = isQuestionLockDate
      ? lockBaseDate
      : new Date(lockBaseDate.getTime() - lockMinutesBeforeKickoff * 60 * 1000);

    if (new Date() >= lockAt) {
      throw new ConflictException('Predictions are locked for this item');
    }
  }

  private normalizeQuestionAnswer(
    answerType: QuestionAnswerType,
    dto: UpsertMatchQuestionPredictionDto,
    options: Array<{ id: string; key: string; teamId: string | null; playerId: string | null; optionConfig: unknown }>,
  ) {
    const providedFields = this.getProvidedAnswerFields(dto);
    const byId = new Map(options.map((option) => [option.id, option]));
    const byKey = new Map(options.map((option) => [option.key, option]));

    if (answerType === QuestionAnswerType.SINGLE_CHOICE) {
      this.assertExactAnswerFields(providedFields, ['selectedOptionId']);

      if (!dto.selectedOptionId) {
        throw new BadRequestException('selectedOptionId is required for SINGLE_CHOICE');
      }

      const option = byId.get(dto.selectedOptionId);
      if (!option) {
        throw new BadRequestException('selectedOptionId is not valid for this question');
      }

      return {
        selectedOptionId: option.id,
        selectedBoolean: null,
        selectedTeamId: null,
        selectedPlayerId: null,
        selectedTimeRangeKey: null,
      };
    }

    if (answerType === QuestionAnswerType.TIME_RANGE) {
      this.assertExactAnswerFields(providedFields, ['selectedTimeRangeKey']);

      if (!dto.selectedTimeRangeKey) {
        throw new BadRequestException('selectedTimeRangeKey is required for TIME_RANGE');
      }

      const option = byKey.get(dto.selectedTimeRangeKey);
      if (!option) {
        throw new BadRequestException('selectedTimeRangeKey is not valid for this question');
      }

      return {
        selectedOptionId: option.id,
        selectedBoolean: null,
        selectedTeamId: null,
        selectedPlayerId: null,
        selectedTimeRangeKey: option.key,
      };
    }

    if (answerType === QuestionAnswerType.TEAM_PICK) {
      this.assertAnyAnswerFieldSet(providedFields, ['selectedTeamId', 'selectedOptionId']);

      const optionByTeam = dto.selectedTeamId
        ? options.find((option) => option.teamId === dto.selectedTeamId)
        : undefined;
      const optionBySelectedId = dto.selectedOptionId
        ? byId.get(dto.selectedOptionId)
        : undefined;

      const option = optionBySelectedId ?? optionByTeam;
      if (!option || !option.teamId) {
        throw new BadRequestException('A valid selectedTeamId or selectedOptionId is required for TEAM_PICK');
      }

      return {
        selectedOptionId: option.id,
        selectedBoolean: null,
        selectedTeamId: option.teamId,
        selectedPlayerId: null,
        selectedTimeRangeKey: null,
      };
    }

    if (answerType === QuestionAnswerType.PLAYER_PICK) {
      this.assertAnyAnswerFieldSet(providedFields, ['selectedPlayerId', 'selectedOptionId']);

      const optionByPlayer = dto.selectedPlayerId
        ? options.find((option) => option.playerId === dto.selectedPlayerId)
        : undefined;
      const optionBySelectedId = dto.selectedOptionId
        ? byId.get(dto.selectedOptionId)
        : undefined;

      const option = optionBySelectedId ?? optionByPlayer;
      if (!option || !option.playerId) {
        throw new BadRequestException('A valid selectedPlayerId or selectedOptionId is required for PLAYER_PICK');
      }

      return {
        selectedOptionId: option.id,
        selectedBoolean: null,
        selectedTeamId: null,
        selectedPlayerId: option.playerId,
        selectedTimeRangeKey: null,
      };
    }

    if (answerType === QuestionAnswerType.BOOLEAN) {
      this.assertExactAnswerFields(providedFields, ['selectedBoolean']);

      if (typeof dto.selectedBoolean !== 'boolean') {
        throw new BadRequestException('selectedBoolean is required for BOOLEAN');
      }

      const optionFromConfig = options.find((option) => {
        if (!option.optionConfig || typeof option.optionConfig !== 'object') {
          return false;
        }

        const candidate = option.optionConfig as { booleanValue?: unknown };
        return candidate.booleanValue === dto.selectedBoolean;
      });

      const optionFromKey = byKey.get(dto.selectedBoolean ? 'YES' : 'NO');
      const option = optionFromConfig ?? optionFromKey;

      if (!option) {
        throw new BadRequestException('No valid option configured for BOOLEAN answer');
      }

      return {
        selectedOptionId: option.id,
        selectedBoolean: dto.selectedBoolean,
        selectedTeamId: null,
        selectedPlayerId: null,
        selectedTimeRangeKey: null,
      };
    }

    throw new BadRequestException('Unsupported answer type');
  }

  private getProvidedAnswerFields(dto: UpsertMatchQuestionPredictionDto) {
    const provided: string[] = [];

    if (dto.selectedOptionId !== undefined) {
      provided.push('selectedOptionId');
    }
    if (dto.selectedBoolean !== undefined) {
      provided.push('selectedBoolean');
    }
    if (dto.selectedTeamId !== undefined) {
      provided.push('selectedTeamId');
    }
    if (dto.selectedPlayerId !== undefined) {
      provided.push('selectedPlayerId');
    }
    if (dto.selectedTimeRangeKey !== undefined) {
      provided.push('selectedTimeRangeKey');
    }

    return provided;
  }

  private assertExactAnswerFields(provided: string[], expected: string[]) {
    if (provided.length !== expected.length || provided.some((field) => !expected.includes(field))) {
      throw new BadRequestException(
        `Invalid answer payload for this question type. Expected only: ${expected.join(', ')}`,
      );
    }
  }

  private assertAnyAnswerFieldSet(provided: string[], allowed: string[]) {
    if (provided.length !== 1 || !allowed.includes(provided[0])) {
      throw new BadRequestException(
        `Invalid answer payload for this question type. Provide exactly one of: ${allowed.join(' or ')}`,
      );
    }
  }
}
