import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PoolMemberStatus, PoolRole, Prisma } from '@prisma/client';

import { JwtUserPayload } from '../auth/types/jwt-user-payload.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { CreatePoolDto } from './dto/create-pool.dto';
import { JoinPoolDto } from './dto/join-pool.dto';
import { ListPoolsDto } from './dto/list-pools.dto';
import { UpdatePoolScoringDto } from './dto/update-pool-scoring.dto';

type MembershipRole = 'OWNER' | 'ADMIN' | 'MEMBER';

@Injectable()
export class PoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPool(currentUser: JwtUserPayload, dto: CreatePoolDto) {
    await this.ensureTournamentExists(dto.tournamentId);

    const joinCode = (dto.joinCode ?? this.generateJoinCode()).toUpperCase();

    try {
      const pool = await this.prisma.$transaction(async (tx) => {
        const createdPool = await tx.pool.create({
          data: {
            tournamentId: dto.tournamentId,
            ownerUserId: currentUser.sub,
            slug: this.normalizeSlug(dto.slug),
            name: dto.name,
            description: dto.description,
            status: 'ACTIVE',
            joinCode,
            maxEntriesPerMember: 1,
            lockMinutesBeforeKickoff: dto.lockMinutesBeforeKickoff ?? 0,
            pointsExactScore: dto.pointsExactScore ?? 3,
            pointsMatchOutcome: dto.pointsMatchOutcome ?? 1,
            pointsBonusCorrect: dto.pointsBonusCorrect ?? 2,
            pointsConfig: this.buildDefaultPointsConfig(dto),
          },
        });

        await tx.poolMember.create({
          data: {
            poolId: createdPool.id,
            userId: currentUser.sub,
            role: 'OWNER',
            status: 'ACTIVE',
          },
        });

        return createdPool;
      });

      return this.getPoolDetail(pool.id, currentUser);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Pool slug or joinCode already exists');
      }
      throw error;
    }
  }

  async listRelevantPools(currentUser: JwtUserPayload, query: ListPoolsDto) {
    const scope = query.scope ?? 'all';

    const where: Prisma.PoolWhereInput = {
      OR: [
        { ownerUserId: currentUser.sub },
        { members: { some: { userId: currentUser.sub, status: 'ACTIVE' } } },
      ],
    };

    if (scope === 'owned') {
      where.OR = undefined;
      where.ownerUserId = currentUser.sub;
    }

    if (scope === 'joined') {
      where.OR = undefined;
      where.members = {
        some: {
          userId: currentUser.sub,
          status: 'ACTIVE',
        },
      };
    }

    const pools = await this.prisma.pool.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

    return pools;
  }

  async getPoolDetail(poolId: string, currentUser: JwtUserPayload) {
    const membership = await this.getActiveMembership(poolId, currentUser.sub);
    const pool = await this.prisma.pool.findUnique({
      where: { id: poolId },
      include: {
        tournament: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            displayName: true,
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

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    return {
      ...pool,
      membership,
    };
  }

  async listPoolMatches(poolId: string, currentUser: JwtUserPayload) {
    const membership = await this.getActiveMembership(poolId, currentUser.sub);

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

    const matches = await this.prisma.match.findMany({
      where: {
        tournamentId: pool.tournamentId,
      },
      orderBy: {
        kickoffAt: 'asc',
      },
      select: {
        id: true,
        stage: true,
        roundLabel: true,
        matchNumber: true,
        group: {
          select: {
            code: true,
          },
        },
        homeSlotLabel: true,
        awaySlotLabel: true,
        kickoffAt: true,
        status: true,
        homeScore: true,
        awayScore: true,
        homeTournamentTeam: {
          select: {
            team: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        awayTournamentTeam: {
          select: {
            team: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        questions: {
          where: {
            isPublished: true,
          },
          select: {
            id: true,
            questionText: true,
            answerType: true,
            isResolved: true,
            pointsOverride: true,
            lockAt: true,
            options: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                key: true,
                label: true,
                teamId: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return {
      poolId,
      membership,
      matches,
    };
  }

  async joinPool(currentUser: JwtUserPayload, dto: JoinPoolDto) {
    const pool = await this.prisma.pool.findFirst({
      where: { joinCode: dto.joinCode.toUpperCase() },
      select: { id: true, status: true },
    });

    if (!pool) {
      throw new NotFoundException('Pool not found for provided joinCode');
    }

    if (pool.status !== 'ACTIVE') {
      throw new BadRequestException('Pool is not open for joining');
    }

    const existingMembership = await this.prisma.poolMember.findUnique({
      where: {
        poolId_userId: {
          poolId: pool.id,
          userId: currentUser.sub,
        },
      },
    });

    if (existingMembership && existingMembership.status === PoolMemberStatus.ACTIVE) {
      throw new ConflictException('User is already an active member of this pool');
    }

    if (existingMembership) {
      await this.prisma.poolMember.update({
        where: { id: existingMembership.id },
        data: {
          status: 'ACTIVE',
          leftAt: null,
          joinedAt: new Date(),
        },
      });
    } else {
      await this.prisma.poolMember.create({
        data: {
          poolId: pool.id,
          userId: currentUser.sub,
          role: 'MEMBER',
          status: 'ACTIVE',
        },
      });
    }

    return this.getMyMembership(pool.id, currentUser);
  }

  async getMyMembership(poolId: string, currentUser: JwtUserPayload) {
    return this.getActiveMembership(poolId, currentUser.sub);
  }

  async createMyEntry(poolId: string, currentUser: JwtUserPayload, dto: CreateEntryDto) {
    const membership = await this.getActiveMembership(poolId, currentUser.sub);

    const pool = await this.prisma.pool.findUnique({ where: { id: poolId }, select: { id: true } });

    if (!pool) {
      throw new NotFoundException('Pool not found');
    }

    const existingEntry = await this.prisma.poolEntry.findFirst({
      where: {
        poolId,
        userId: currentUser.sub,
      },
      select: { id: true },
    });

    if (existingEntry) {
      throw new ConflictException('User already has an entry in this pool');
    }

    const entry = await this.prisma.poolEntry.create({
      data: {
        poolId,
        userId: currentUser.sub,
        entryNumber: 1,
        entryName: dto.entryName ?? 'Mi Entry',
      },
    });

    return {
      ...entry,
      membershipRole: membership.role,
    };
  }

  async listMyEntries(poolId: string, currentUser: JwtUserPayload) {
    await this.getActiveMembership(poolId, currentUser.sub);

    return this.prisma.poolEntry.findMany({
      where: {
        poolId,
        userId: currentUser.sub,
      },
      orderBy: { entryNumber: 'asc' },
    });
  }

  async updatePoolScoring(poolId: string, currentUser: JwtUserPayload, dto: UpdatePoolScoringDto) {
    const membership = await this.getActiveMembership(poolId, currentUser.sub);
    this.assertPoolAdminOrOwner(membership.role);

    const updatedPool = await this.prisma.pool.update({
      where: { id: poolId },
      data: {
        pointsExactScore: dto.pointsExactScore,
        pointsMatchOutcome: dto.pointsMatchOutcome,
        pointsBonusCorrect: dto.pointsBonusCorrect,
        pointsConfig: dto.pointsConfig as Prisma.InputJsonValue | undefined,
      },
    });

    return updatedPool;
  }

  private async ensureTournamentExists(tournamentId: string): Promise<void> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { id: true },
    });

    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
  }

  private async getActiveMembership(poolId: string, userId: string) {
    const membership = await this.prisma.poolMember.findUnique({
      where: {
        poolId_userId: {
          poolId,
          userId,
        },
      },
      select: {
        id: true,
        poolId: true,
        userId: true,
        role: true,
        status: true,
        joinedAt: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException('User is not a member of this pool');
    }

    if (membership.status !== PoolMemberStatus.ACTIVE) {
      throw new ForbiddenException('Membership is not active in this pool');
    }

    return membership;
  }

  private assertPoolAdminOrOwner(role: PoolRole): asserts role is MembershipRole {
    if (role !== PoolRole.OWNER && role !== PoolRole.ADMIN) {
      throw new ForbiddenException('Only pool owner or admin can perform this action');
    }
  }

  private normalizeSlug(slug: string): string {
    return slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '');
  }

  private generateJoinCode(): string {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return code;
  }

  private buildDefaultPointsConfig(dto: CreatePoolDto): Prisma.InputJsonObject {
    return {
      match: {
        exactScore: dto.pointsExactScore ?? 3,
        outcome: dto.pointsMatchOutcome ?? 1,
      },
      bonus: {
        default: dto.pointsBonusCorrect ?? 2,
      },
    };
  }
}
