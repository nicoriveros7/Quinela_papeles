import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchStatus, Prisma, QuestionAnswerType, TournamentPlayerStatus } from '@prisma/client';

import { JwtUserPayload } from '../auth/types/jwt-user-payload.type';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { CreateMatchQuestionDto } from './dto/create-match-question.dto';
import { ResolveMatchQuestionDto } from './dto/resolve-match-question.dto';
import { UpdateMatchQuestionDto } from './dto/update-match-question.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: ScoringService,
  ) {}

  async listTournaments() {
    return this.prisma.tournament.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        _count: {
          select: {
            matches: true,
            pools: true,
          },
        },
      },
    });
  }

  async listPools() {
    return this.prisma.pool.findMany({
      orderBy: [{ createdAt: 'desc' }],
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
        _count: {
          select: {
            members: true,
            entries: true,
          },
        },
      },
    });
  }

  async listTournamentMatches(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true, name: true },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const matches = await this.prisma.match.findMany({
      where: { tournamentId },
      orderBy: { kickoffAt: 'asc' },
      include: {
        group: {
          select: {
            code: true,
          },
        },
        homeTournamentTeam: {
          select: {
            id: true,
            team: {
              select: {
                id: true,
                name: true,
                code: true,
                flagEmoji: true,
              },
            },
          },
        },
        awayTournamentTeam: {
          select: {
            id: true,
            team: {
              select: {
                id: true,
                name: true,
                code: true,
                flagEmoji: true,
              },
            },
          },
        },
        _count: {
          select: {
            questions: true,
            predictions: true,
          },
        },
      },
    });

    return {
      tournament,
      matches,
    };
  }

  async listPoolMatches(poolId: string) {
    const pool = await this.prisma.pool.findUnique({
      where: { id: poolId },
      select: {
        id: true,
        name: true,
        tournamentId: true,
      },
    });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    const payload = await this.listTournamentMatches(pool.tournamentId);

    return {
      pool,
      ...payload,
    };
  }

  async listMatchQuestions(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTournamentTeam: {
          select: {
            team: {
              select: {
                name: true,
                code: true,
                flagEmoji: true,
              },
            },
          },
        },
        awayTournamentTeam: {
          select: {
            team: {
              select: {
                name: true,
                code: true,
                flagEmoji: true,
              },
            },
          },
        },
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const questions = await this.prisma.matchQuestion.findMany({
      where: { matchId },
      orderBy: [{ createdAt: 'asc' }],
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
        template: {
          select: {
            id: true,
            code: true,
            title: true,
            defaultPoints: true,
          },
        },
      },
    });

    return {
      match,
      questions,
    };
  }

  async listMatchPlayerPool(matchId: string) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
        tournamentId: true,
        homeTournamentTeamId: true,
        awayTournamentTeamId: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const teams = await this.prisma.tournamentTeam.findMany({
      where: { tournamentId: match.tournamentId },
      select: {
        id: true,
        teamId: true,
        team: {
          select: {
            code: true,
            name: true,
          },
        },
        players: {
          where: {
            squadStatus: {
              in: [TournamentPlayerStatus.PROVISIONAL, TournamentPlayerStatus.FINAL],
            },
          },
          orderBy: [{ player: { fullName: 'asc' } }],
          select: {
            playerId: true,
            shirtNumber: true,
            position: true,
            squadStatus: true,
            isGoalkeeper: true,
            player: {
              select: {
                fullName: true,
                shortName: true,
                preferredPosition: true,
              },
            },
          },
        },
      },
      orderBy: {
        team: {
          code: 'asc',
        },
      },
    });

    return {
      matchId: match.id,
      tournamentId: match.tournamentId,
      teams: teams.map((team) => ({
        tournamentTeamId: team.id,
        teamId: team.teamId,
        teamCode: team.team.code,
        teamName: team.team.name,
        isMatchParticipant:
          team.id === match.homeTournamentTeamId || team.id === match.awayTournamentTeamId,
        matchSide:
          team.id === match.homeTournamentTeamId
            ? 'HOME'
            : team.id === match.awayTournamentTeamId
              ? 'AWAY'
              : null,
        players: team.players.map((playerRow) => ({
          playerId: playerRow.playerId,
          fullName: playerRow.player.fullName,
          shortName: playerRow.player.shortName,
          shirtNumber: playerRow.shirtNumber,
          position: playerRow.position,
          preferredPosition: playerRow.player.preferredPosition,
          squadStatus: playerRow.squadStatus,
          isGoalkeeper: playerRow.isGoalkeeper,
        })),
      })),
    };
  }

  async createMatchQuestion(matchId: string, dto: CreateMatchQuestionDto) {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      select: {
        id: true,
      },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    const key = dto.key ? this.normalizeQuestionKey(dto.key) : this.generateQuestionKey(dto.questionText);

    const options = this.buildQuestionOptions(dto);

    try {
      const question = await this.prisma.$transaction(async (tx) => {
        const created = await tx.matchQuestion.create({
          data: {
            matchId,
            key,
            questionText: dto.questionText,
            answerType: dto.answerType,
            pointsOverride: dto.pointsOverride,
            isPublished: dto.isPublished ?? false,
            lockAt: dto.lockAt ? new Date(dto.lockAt) : null,
          },
        });

        await tx.matchQuestionOption.createMany({
          data: options.map((option, index) => ({
            matchQuestionId: created.id,
            key: option.key,
            label: option.label,
            teamId: option.teamId,
            playerId: option.playerId,
            sortOrder: index,
            optionConfig: option.optionConfig ?? Prisma.JsonNull,
          })),
        });

        return tx.matchQuestion.findUnique({
          where: { id: created.id },
          include: {
            options: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        });
      });

      return question;
    } catch (error) {
      throw new ConflictException('Could not create question. Key may already exist for this match.');
    }
  }

  async updateMatchQuestion(questionId: string, dto: UpdateMatchQuestionDto) {
    const question = await this.prisma.matchQuestion.findUnique({
      where: { id: questionId },
      include: {
        options: {
          where: { isActive: true },
          select: {
            id: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Match question not found');
    }

    if (dto.correctOptionId) {
      const valid = question.options.some((option) => option.id === dto.correctOptionId);
      if (!valid) {
        throw new BadRequestException('correctOptionId does not belong to this question');
      }
    }

    return this.prisma.matchQuestion.update({
      where: { id: questionId },
      data: {
        questionText: dto.questionText,
        pointsOverride: dto.pointsOverride,
        lockAt: dto.lockAt ? new Date(dto.lockAt) : dto.lockAt === null ? null : undefined,
        isPublished: dto.isPublished,
        correctOptionId: dto.correctOptionId,
      },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async resolveMatchQuestion(questionId: string, dto: ResolveMatchQuestionDto) {
    const question = await this.prisma.matchQuestion.findUnique({
      where: { id: questionId },
      include: {
        options: {
          where: { isActive: true },
          select: {
            id: true,
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException('Match question not found');
    }

    const valid = question.options.some((option) => option.id === dto.correctOptionId);
    if (!valid) {
      throw new BadRequestException('correctOptionId does not belong to this question');
    }

    return this.prisma.matchQuestion.update({
      where: { id: questionId },
      data: {
        correctOptionId: dto.correctOptionId,
        isResolved: true,
        resolvedAt: new Date(),
      },
      include: {
        options: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
  }

  async deleteMatchQuestion(questionId: string) {
    const question = await this.prisma.matchQuestion.findUnique({
      where: { id: questionId },
      select: { id: true, isResolved: true },
    });

    if (!question) {
      throw new NotFoundException('Match question not found');
    }

    if (question.isResolved) {
      throw new ConflictException('No se puede eliminar una pregunta ya resuelta porque afectaría el scoring.');
    }

    await this.prisma.matchQuestion.delete({ where: { id: questionId } });
  }

  async recalculatePoolScoring(poolId: string, user: JwtUserPayload) {
    return this.scoringService.recalculatePool(poolId, user);
  }

  async getTournamentPredictionLock(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        tournamentPredictionsLocked: true,
        tournamentPredictionsLockAt: true,
      },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const lockAt = tournament.tournamentPredictionsLockAt;
    const isLocked =
      tournament.tournamentPredictionsLocked || (lockAt !== null && new Date() >= lockAt);

    return {
      tournamentId: tournament.id,
      isLocked,
      lockedManually: tournament.tournamentPredictionsLocked,
      lockAt: lockAt?.toISOString() ?? null,
    };
  }

  async updateTournamentPredictionLock(
    tournamentId: string,
    payload: { locked?: boolean; lockAt?: string | null },
  ) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');

    const data: { tournamentPredictionsLocked?: boolean; tournamentPredictionsLockAt?: Date | null } = {};

    if (typeof payload.locked === 'boolean') {
      data.tournamentPredictionsLocked = payload.locked;
    }

    if ('lockAt' in payload) {
      data.tournamentPredictionsLockAt = payload.lockAt ? new Date(payload.lockAt) : null;
    }

    const updated = await this.prisma.tournament.update({
      where: { id: tournamentId },
      data,
      select: {
        id: true,
        tournamentPredictionsLocked: true,
        tournamentPredictionsLockAt: true,
      },
    });

    const lockAt = updated.tournamentPredictionsLockAt;
    const isLocked =
      updated.tournamentPredictionsLocked || (lockAt !== null && new Date() >= lockAt);

    return {
      tournamentId: updated.id,
      isLocked,
      lockedManually: updated.tournamentPredictionsLocked,
      lockAt: lockAt?.toISOString() ?? null,
    };
  }

  async listTournamentPlayers(tournamentId: string) {
    const teams = await this.prisma.tournamentTeam.findMany({
      where: { tournamentId },
      select: {
        id: true,
        team: { select: { code: true, name: true, flagEmoji: true } },
        players: {
          where: {
            squadStatus: { in: [TournamentPlayerStatus.PROVISIONAL, TournamentPlayerStatus.FINAL] },
          },
          orderBy: { player: { fullName: 'asc' } },
          select: {
            id: true,
            isGoalkeeper: true,
            position: true,
            shirtNumber: true,
            player: { select: { fullName: true, shortName: true } },
          },
        },
      },
      orderBy: { team: { code: 'asc' } },
    });

    return teams.flatMap((team) =>
      team.players.map((p) => ({
        id: p.id,
        fullName: p.player.fullName,
        shortName: p.player.shortName,
        isGoalkeeper: p.isGoalkeeper,
        position: p.position,
        shirtNumber: p.shirtNumber,
        teamCode: team.team.code,
        teamName: team.team.name,
        teamFlagEmoji: team.team.flagEmoji,
      })),
    );
  }

  async getTournamentActualResults(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: {
        id: true,
        actualChampionTournamentTeamId: true,
        actualRunnerUpTournamentTeamId: true,
        actualThirdPlaceTournamentTeamId: true,
        actualTopScorerTournamentPlayerId: true,
        actualGoldenBallTournamentPlayerId: true,
        actualGoldenGloveTournamentPlayerId: true,
        actualBestThirdsTeamIds: true,
      },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');
    return tournament;
  }

  async setTournamentActualResults(
    tournamentId: string,
    payload: {
      actualChampionTournamentTeamId?: string | null;
      actualRunnerUpTournamentTeamId?: string | null;
      actualThirdPlaceTournamentTeamId?: string | null;
      actualTopScorerTournamentPlayerId?: string | null;
      actualGoldenBallTournamentPlayerId?: string | null;
      actualGoldenGloveTournamentPlayerId?: string | null;
      actualBestThirdsTeamIds?: string[] | null;
    },
  ) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true },
    });
    if (!tournament) throw new NotFoundException('Tournament not found');

    return this.prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        ...payload,
        actualBestThirdsTeamIds: payload.actualBestThirdsTeamIds ?? undefined,
      },
      select: {
        id: true,
        actualChampionTournamentTeamId: true,
        actualRunnerUpTournamentTeamId: true,
        actualThirdPlaceTournamentTeamId: true,
        actualTopScorerTournamentPlayerId: true,
        actualGoldenBallTournamentPlayerId: true,
        actualGoldenGloveTournamentPlayerId: true,
        actualBestThirdsTeamIds: true,
      },
    });
  }

  async updateMatchResult(matchId: string, payload: { status?: MatchStatus; homeScore?: number; awayScore?: number }) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId }, select: { id: true } });
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    return this.prisma.match.update({
      where: { id: matchId },
      data: {
        status: payload.status,
        homeScore: payload.homeScore,
        awayScore: payload.awayScore,
        resultConfirmedAt: payload.status === MatchStatus.FINISHED ? new Date() : undefined,
      },
    });
  }

  async updateMatchSchedule(matchId: string, kickoffAt: Date) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId }, select: { id: true } });
    if (!match) throw new NotFoundException('Match not found');
    return this.prisma.match.update({
      where: { id: matchId },
      data: { kickoffAt },
    });
  }

  private normalizeQuestionKey(raw: string) {
    return raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '');
  }

  private generateQuestionKey(questionText: string) {
    const base = this.normalizeQuestionKey(questionText).slice(0, 28);
    return `${base || 'question'}-${Date.now().toString(36)}`;
  }

  private buildQuestionOptions(dto: CreateMatchQuestionDto) {
    if (dto.answerType === QuestionAnswerType.BOOLEAN) {
      return [
        { key: 'YES', label: 'Si', teamId: null, playerId: null, optionConfig: { booleanValue: true } },
        { key: 'NO', label: 'No', teamId: null, playerId: null, optionConfig: { booleanValue: false } },
      ];
    }

    if (!dto.options || dto.options.length < 2) {
      throw new BadRequestException('At least two options are required for non-BOOLEAN questions');
    }

    if (dto.answerType === QuestionAnswerType.PLAYER_PICK) {
      const missingPlayer = dto.options.some((option) => !option.playerId);
      if (missingPlayer) {
        throw new BadRequestException('PLAYER_PICK options must include playerId');
      }

      const uniquePlayerIds = new Set(dto.options.map((option) => option.playerId));
      if (uniquePlayerIds.size !== dto.options.length) {
        throw new BadRequestException('PLAYER_PICK options cannot repeat playerId');
      }
    }

    return dto.options.map((option) => ({
      key: this.normalizeQuestionKey(option.key).toUpperCase(),
      label: option.label,
      teamId: option.teamId ?? null,
      playerId: option.playerId ?? null,
      optionConfig: null,
    }));
  }
}
