import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MatchStage, MatchStatus, PoolMemberStatus, QuestionAnswerType } from '@prisma/client';

import { JwtUserPayload } from '../auth/types/jwt-user-payload.type';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertMatchPredictionDto } from './dto/upsert-match-prediction.dto';
import { UpsertMatchQuestionPredictionDto } from './dto/upsert-match-question-prediction.dto';
import { EntryBreakdownResponse } from './dto/entry-breakdown.dto';
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

    const wantsJoker = dto.isJoker === true;

    // Joker validation
    if (wantsJoker) {
      const bucket = this.getJokerBucket(match.stage, match.roundLabel);
      if (!bucket) {
        throw new BadRequestException('Este partido no pertenece a ningún bucket de Joker válido');
      }

      // Find existing joker in same bucket to potentially swap it
      const existingJokerWhere =
        bucket === 'KNOCKOUT'
          ? {
              poolEntryId: entryId,
              isJoker: true,
              matchId: { not: matchId },
              match: { stage: { not: MatchStage.GROUP } },
            }
          : {
              poolEntryId: entryId,
              isJoker: true,
              matchId: { not: matchId },
              match: { stage: MatchStage.GROUP, roundLabel: match.roundLabel },
            };

      const existingJokers = await this.prisma.matchPrediction.findMany({
        where: existingJokerWhere,
        select: { id: true, matchId: true, match: { select: { kickoffAt: true, status: true } } },
      });

      // If ANY existing joker in the bucket is locked, reject the request
      const lockedJoker = existingJokers.find((ej) => {
        const notEditable =
          ej.match.status !== 'SCHEDULED' ||
          new Date() >= new Date(ej.match.kickoffAt.getTime() - entryContext.pool.lockMinutesBeforeKickoff * 60_000);
        return notEditable;
      });
      if (lockedJoker) {
        throw new ConflictException(
          'Ya tienes un Joker bloqueado en esta jornada y no puedes cambiarlo.',
        );
      }

      // Deactivate ALL existing jokers in the bucket (handles corruption with >1 joker)
      if (existingJokers.length > 0) {
        await this.prisma.matchPrediction.updateMany({
          where: { id: { in: existingJokers.map((ej) => ej.id) } },
          data: { isJoker: false },
        });
      }
    }

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
        ...(dto.isJoker !== undefined ? { isJoker: dto.isJoker } : {}),
      },
      create: {
        poolEntryId: entryId,
        matchId,
        predictedHomeScore: dto.predictedHomeScore,
        predictedAwayScore: dto.predictedAwayScore,
        isJoker: wantsJoker,
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
            include: {
              player: {
                select: {
                  fullName: true,
                  shortName: true,
                  nameOnShirt: true,
                  preferredPosition: true,
                },
              },
            },
          },
          correctOption: {
            include: {
              player: { select: { fullName: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Enrich options with TournamentPlayer data (shirtNumber, position, team)
    const playerIds = [
      ...new Set(
        questions.flatMap((q) =>
          q.options.flatMap((o) => (o.playerId ? [o.playerId] : [])),
        ),
      ),
    ];
    const tpMap = new Map<string, { shirtNumber: number | null; position: string | null; teamCode: string | null; teamName: string | null; teamFlagEmoji: string | null }>();
    if (playerIds.length > 0) {
      const tpRows = await this.prisma.tournamentPlayer.findMany({
        where: { playerId: { in: playerIds }, tournamentId: entryContext.pool.tournamentId },
        select: {
          playerId: true,
          shirtNumber: true,
          position: true,
          tournamentTeam: {
            select: {
              team: { select: { code: true, name: true, flagEmoji: true } },
            },
          },
        },
      });
      for (const tp of tpRows) {
        tpMap.set(tp.playerId, {
          shirtNumber: tp.shirtNumber,
          position: tp.position,
          teamCode: tp.tournamentTeam.team.code,
          teamName: tp.tournamentTeam.team.name,
          teamFlagEmoji: tp.tournamentTeam.team.flagEmoji,
        });
      }
    }

    const enrichedQuestions = questions.map((q) => ({
      ...q,
      correctOptionId: q.isResolved ? q.correctOptionId : null,
      options: q.options.map((opt) => {
        const tp = opt.playerId ? tpMap.get(opt.playerId) : undefined;
        const base = opt.player;
        return {
          ...opt,
          player: base
            ? {
                fullName: base.fullName,
                shortName: base.shortName,
                nameOnShirt: base.nameOnShirt,
                preferredPosition: base.preferredPosition,
                shirtNumber: tp?.shirtNumber ?? null,
                position: tp?.position ?? null,
                teamCode: tp?.teamCode ?? null,
                teamName: tp?.teamName ?? null,
                teamFlagEmoji: tp?.teamFlagEmoji ?? null,
              }
            : null,
        };
      }),
    }));

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
        stage: match.stage,
        roundLabel: match.roundLabel,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      },
      matchPrediction,
      matchPredictionBreakdown,
      questions: enrichedQuestions,
      questionPredictions,
    };
  }

  async getEntryBreakdown(
    poolId: string,
    entryId: string,
    currentUser: JwtUserPayload,
  ): Promise<EntryBreakdownResponse> {
    const [entry, membership] = await Promise.all([
      this.prisma.poolEntry.findUnique({
        where: { id: entryId },
        select: {
          id: true,
          poolId: true,
          userId: true,
          entryName: true,
          rank: true,
          totalPoints: true,
          user: { select: { displayName: true } },
          pool: {
            select: {
              tournamentId: true,
              pointsExactScore: true,
              pointsMatchOutcome: true,
              pointsConfig: true,
              lockMinutesBeforeKickoff: true,
              pointsChampionCorrect: true,
              pointsRunnerUpCorrect: true,
              pointsThirdPlaceCorrect: true,
              pointsTopScorerCorrect: true,
              pointsGoldenBallCorrect: true,
              pointsGoldenGloveCorrect: true,
              pointsBestThirdsExact: true,
              pointsBestThirdsPartial: true,
            },
          },
        },
      }),
      this.prisma.poolMember.findUnique({
        where: { poolId_userId: { poolId, userId: currentUser.sub } },
        select: { status: true },
      }),
    ]);

    if (!membership || membership.status !== PoolMemberStatus.ACTIVE) {
      throw new ForbiddenException('Active pool membership is required');
    }

    if (!entry || entry.poolId !== poolId) {
      throw new NotFoundException('Entry not found in this pool');
    }

    const isOwner = entry.userId === currentUser.sub;
    const { pool } = entry;
    const scoringConfig = resolveMatchScoringConfig(
      pool.pointsExactScore,
      pool.pointsMatchOutcome,
      pool.pointsConfig,
    );

    const [matches, tournamentPrediction, tournament] = await Promise.all([
      this.prisma.match.findMany({
        where: { tournamentId: pool.tournamentId },
        orderBy: { kickoffAt: 'asc' },
        select: {
          id: true,
          kickoffAt: true,
          status: true,
          stage: true,
          roundLabel: true,
          homeScore: true,
          awayScore: true,
          homeSlotLabel: true,
          awaySlotLabel: true,
          homeTournamentTeam: { select: { team: { select: { name: true, code: true, flagEmoji: true } } } },
          awayTournamentTeam: { select: { team: { select: { name: true, code: true, flagEmoji: true } } } },
          predictions: {
            where: { poolEntryId: entryId },
            select: { predictedHomeScore: true, predictedAwayScore: true, pointsAwarded: true, isScored: true, isJoker: true },
          },
          questions: {
            where: { isPublished: true },
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              questionText: true,
              answerType: true,
              isResolved: true,
              correctOption: {
                select: {
                  label: true,
                  player: { select: { fullName: true } },
                },
              },
              predictions: {
                where: { poolEntryId: entryId },
                select: {
                  pointsAwarded: true,
                  isScored: true,
                  selectedBoolean: true,
                  selectedOption: { select: { label: true } },
                  selectedTeam: { select: { name: true } },
                  selectedPlayer: { select: { fullName: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.tournamentPrediction.findFirst({
        where: { poolEntryId: entryId, tournamentId: pool.tournamentId },
        select: {
          pointsAwarded: true,
          isScored: true,
          isLocked: true,
          bestThirdsTeamIds: true,
          championTournamentTeamId: true,
          runnerUpTournamentTeamId: true,
          thirdPlaceTournamentTeamId: true,
          topScorerTournamentPlayerId: true,
          goldenBallTournamentPlayerId: true,
          goldenGloveTournamentPlayerId: true,
          champion: { select: { team: { select: { name: true, code: true, flagEmoji: true } } } },
          runnerUp: { select: { team: { select: { name: true, code: true, flagEmoji: true } } } },
          thirdPlace: { select: { team: { select: { name: true, code: true, flagEmoji: true } } } },
          topScorer: { select: { player: { select: { fullName: true } } } },
          goldenBall: { select: { player: { select: { fullName: true } } } },
          goldenGlove: { select: { player: { select: { fullName: true } } } },
        },
      }),
      this.prisma.tournament.findUnique({
        where: { id: pool.tournamentId },
        select: {
          tournamentPredictionsLocked: true,
          actualChampionTournamentTeamId: true,
          actualRunnerUpTournamentTeamId: true,
          actualThirdPlaceTournamentTeamId: true,
          actualTopScorerTournamentPlayerId: true,
          actualGoldenBallTournamentPlayerId: true,
          actualGoldenGloveTournamentPlayerId: true,
          actualBestThirdsTeamIds: true,
        },
      }),
    ]);

    // Resolve bestThirds IDs to team data
    let resolvedBestThirds: { name: string; code: string; flagEmoji: string | null }[] | null = null;
    if (tournamentPrediction && Array.isArray(tournamentPrediction.bestThirdsTeamIds)) {
      const ids = tournamentPrediction.bestThirdsTeamIds as string[];
      if (ids.length > 0) {
        const teamRows = await this.prisma.tournamentTeam.findMany({
          where: { id: { in: ids } },
          select: { id: true, team: { select: { name: true, code: true, flagEmoji: true } } },
        });
        const teamMap = new Map(teamRows.map((t) => [t.id, t.team]));
        resolvedBestThirds = ids
          .map((id) => teamMap.get(id))
          .filter((t): t is { name: string; code: string; flagEmoji: string | null } => t != null);
      } else {
        resolvedBestThirds = [];
      }
    }

    let totalMatchPoints = 0;
    let totalBonusPoints = 0;
    let totalJokerBonus = 0;

    const now = new Date();

    const matchPredictions = matches.map((match) => {
      const pred = match.predictions[0] ?? null;

      const lockAt = new Date(match.kickoffAt.getTime() - pool.lockMinutesBeforeKickoff * 60_000);
      const isLocked = now >= lockAt || match.status !== MatchStatus.SCHEDULED;
      const visibility: 'VISIBLE' | 'HIDDEN_UNTIL_LOCKED' =
        isOwner || isLocked ? 'VISIBLE' : 'HIDDEN_UNTIL_LOCKED';

      let breakdown = null;
      if (
        visibility === 'VISIBLE' &&
        pred &&
        match.status === MatchStatus.FINISHED &&
        match.homeScore !== null &&
        match.awayScore !== null
      ) {
        breakdown = calculateMatchPredictionBreakdown(
          pred.predictedHomeScore,
          pred.predictedAwayScore,
          match.homeScore,
          match.awayScore,
          scoringConfig,
        ).breakdown;
      }

      totalMatchPoints += pred?.pointsAwarded ?? 0;

      const questions = match.questions.map((q) => {
        const qPred = q.predictions[0] ?? null;
        const questionPoints = qPred?.pointsAwarded ?? 0;
        totalBonusPoints += questionPoints;

        if (visibility === 'HIDDEN_UNTIL_LOCKED') {
          return {
            questionId: q.id,
            questionText: q.questionText,
            answerLabel: null,
            correctAnswerLabel: null,
            pointsAwarded: 0,
            isScored: false,
            isCorrect: null,
          };
        }

        return {
          questionId: q.id,
          questionText: q.questionText,
          answerLabel: this.resolveAnswerLabel(q.answerType, qPred),
          correctAnswerLabel: q.isResolved
            ? (q.correctOption?.player?.fullName ?? q.correctOption?.label ?? null)
            : null,
          pointsAwarded: questionPoints,
          isScored: qPred?.isScored ?? false,
          isCorrect: qPred?.isScored ? questionPoints > 0 : null,
        };
      });

      // Compute joker extra points: one additional copy of (matchPts + bonusPts)
      const matchBonusTotal = questions.reduce((sum, q) => sum + q.pointsAwarded, 0);
      const jokerBonusPoints =
        pred?.isJoker && pred?.isScored
          ? (pred.pointsAwarded + matchBonusTotal)
          : 0;
      if (visibility === 'VISIBLE') {
        totalJokerBonus += jokerBonusPoints;
      }

      return {
        matchId: match.id,
        kickoffAt: match.kickoffAt,
        status: match.status,
        stage: match.stage,
        roundLabel: match.roundLabel,
        homeTeamName: match.homeTournamentTeam?.team?.name ?? match.homeSlotLabel ?? null,
        homeTeamCode: match.homeTournamentTeam?.team?.code ?? null,
        homeTeamFlagEmoji: match.homeTournamentTeam?.team?.flagEmoji ?? null,
        awayTeamName: match.awayTournamentTeam?.team?.name ?? match.awaySlotLabel ?? null,
        awayTeamCode: match.awayTournamentTeam?.team?.code ?? null,
        awayTeamFlagEmoji: match.awayTournamentTeam?.team?.flagEmoji ?? null,
        homeSlotLabel: match.homeSlotLabel,
        awaySlotLabel: match.awaySlotLabel,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        visibility,
        predictedHomeScore: visibility === 'VISIBLE' ? (pred?.predictedHomeScore ?? null) : null,
        predictedAwayScore: visibility === 'VISIBLE' ? (pred?.predictedAwayScore ?? null) : null,
        pointsAwarded: visibility === 'VISIBLE' ? (pred?.pointsAwarded ?? 0) : 0,
        isJoker: visibility === 'VISIBLE' ? (pred?.isJoker ?? false) : false,
        jokerBucket: this.getJokerBucket(match.stage, match.roundLabel),
        jokerBonusPoints: visibility === 'VISIBLE' ? jokerBonusPoints : 0,
        breakdown,
        questions,
      };
    });

    const tournamentPoints = tournamentPrediction?.pointsAwarded ?? 0;

    // Reveal tournament predictions to non-owners only once the first match starts,
    // the entry's prediction is locked, or the pool globally locked tournament predictions.
    const anyMatchStarted = matches.some((m) => m.status !== MatchStatus.SCHEDULED);
    const isTournamentPredVisible =
      isOwner ||
      anyMatchStarted ||
      (tournamentPrediction?.isLocked ?? false) ||
      (tournament?.tournamentPredictionsLocked ?? false);

    // Per-field score breakdown (uses actual results from tournament)
    const computeFieldScore = (
      actualId: string | null | undefined,
      predictedId: string | null | undefined,
      pts: number,
    ): { points: number; isCorrect: boolean | null } => {
      if (!actualId) return { points: 0, isCorrect: null };
      const correct = actualId === predictedId;
      return { points: correct ? pts : 0, isCorrect: correct };
    };

    let fieldBreakdown: import('./dto/entry-breakdown.dto').TournamentFieldBreakdown | null = null;
    if (tournamentPrediction && tournament) {
      const actualBestThirdsIds = Array.isArray(tournament.actualBestThirdsTeamIds)
        ? (tournament.actualBestThirdsTeamIds as string[])
        : [];
      const predictedBestThirdsIds = Array.isArray(tournamentPrediction.bestThirdsTeamIds)
        ? (tournamentPrediction.bestThirdsTeamIds as string[])
        : [];
      const actualBestThirdsSet = new Set(actualBestThirdsIds);
      const hits = predictedBestThirdsIds.filter((id) => actualBestThirdsSet.has(id)).length;
      const bestThirdsPoints =
        actualBestThirdsIds.length === 0 ? 0
        : hits >= 8 ? pool.pointsBestThirdsExact
        : hits >= 4 ? pool.pointsBestThirdsPartial
        : 0;

      fieldBreakdown = {
        champion:    computeFieldScore(tournament.actualChampionTournamentTeamId,   tournamentPrediction.championTournamentTeamId,   pool.pointsChampionCorrect),
        runnerUp:    computeFieldScore(tournament.actualRunnerUpTournamentTeamId,    tournamentPrediction.runnerUpTournamentTeamId,    pool.pointsRunnerUpCorrect),
        thirdPlace:  computeFieldScore(tournament.actualThirdPlaceTournamentTeamId,  tournamentPrediction.thirdPlaceTournamentTeamId,  pool.pointsThirdPlaceCorrect),
        topScorer:   computeFieldScore(tournament.actualTopScorerTournamentPlayerId, tournamentPrediction.topScorerTournamentPlayerId, pool.pointsTopScorerCorrect),
        goldenBall:  computeFieldScore(tournament.actualGoldenBallTournamentPlayerId, tournamentPrediction.goldenBallTournamentPlayerId, pool.pointsGoldenBallCorrect),
        goldenGlove: computeFieldScore(tournament.actualGoldenGloveTournamentPlayerId, tournamentPrediction.goldenGloveTournamentPlayerId, pool.pointsGoldenGloveCorrect),
        bestThirds: {
          points: bestThirdsPoints,
          isCorrect: actualBestThirdsIds.length === 0 ? null : bestThirdsPoints > 0,
          hits,
          total: actualBestThirdsIds.length,
        },
      };
    }

    return {
      entryId,
      participantName: entry.entryName ?? `#${entryId.slice(-6)}`,
      displayName: entry.user.displayName,
      rank: entry.rank,
      totalPoints: entry.totalPoints,
      summary: {
        matchPoints: totalMatchPoints,
        bonusPoints: totalBonusPoints,
        tournamentPoints,
        jokerPoints: totalJokerBonus,
      },
      matchPredictions,
      tournamentPrediction: isTournamentPredVisible && tournamentPrediction
        ? {
            champion: tournamentPrediction.champion?.team?.name ?? null,
            championCode: tournamentPrediction.champion?.team?.code ?? null,
            championFlagEmoji: tournamentPrediction.champion?.team?.flagEmoji ?? null,
            runnerUp: tournamentPrediction.runnerUp?.team?.name ?? null,
            runnerUpCode: tournamentPrediction.runnerUp?.team?.code ?? null,
            runnerUpFlagEmoji: tournamentPrediction.runnerUp?.team?.flagEmoji ?? null,
            thirdPlace: tournamentPrediction.thirdPlace?.team?.name ?? null,
            thirdPlaceCode: tournamentPrediction.thirdPlace?.team?.code ?? null,
            thirdPlaceFlagEmoji: tournamentPrediction.thirdPlace?.team?.flagEmoji ?? null,
            topScorer: tournamentPrediction.topScorer?.player?.fullName ?? null,
            goldenBall: tournamentPrediction.goldenBall?.player?.fullName ?? null,
            goldenGlove: tournamentPrediction.goldenGlove?.player?.fullName ?? null,
            bestThirds: resolvedBestThirds,
            pointsAwarded: tournamentPoints,
            isScored: tournamentPrediction.isScored,
            fieldBreakdown,
          }
        : null,
      tournamentPredictionHidden: !isTournamentPredVisible && tournamentPrediction !== null,
    };
  }

  private resolveAnswerLabel(
    answerType: QuestionAnswerType,
    pred: {
      selectedOption: { label: string } | null;
      selectedBoolean: boolean | null;
      selectedTeam: { name: string } | null;
      selectedPlayer: { fullName: string } | null;
    } | null,
  ): string | null {
    if (!pred) return null;
    if (pred.selectedOption?.label) return pred.selectedOption.label;
    if (answerType === QuestionAnswerType.BOOLEAN && pred.selectedBoolean !== null) {
      return pred.selectedBoolean ? 'Sí' : 'No';
    }
    if (pred.selectedTeam?.name) return pred.selectedTeam.name;
    if (pred.selectedPlayer?.fullName) return pred.selectedPlayer.fullName;
    return null;
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
        stage: true,
        roundLabel: true,
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

  private getJokerBucket(
    stage: string,
    roundLabel: string | null,
  ): 'GROUP_MATCHDAY_1' | 'GROUP_MATCHDAY_2' | 'GROUP_MATCHDAY_3' | 'KNOCKOUT' | null {
    if (stage === MatchStage.GROUP) {
      if (roundLabel === 'Matchday 1') return 'GROUP_MATCHDAY_1';
      if (roundLabel === 'Matchday 2') return 'GROUP_MATCHDAY_2';
      if (roundLabel === 'Matchday 3') return 'GROUP_MATCHDAY_3';
      return null;
    }
    return 'KNOCKOUT';
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
      if (!option) {
        throw new BadRequestException('A valid selectedTeamId or selectedOptionId is required for TEAM_PICK');
      }

      return {
        selectedOptionId: option.id,
        selectedBoolean: null,
        selectedTeamId: option.teamId ?? null,
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
