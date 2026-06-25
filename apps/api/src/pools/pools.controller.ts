import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';

import { JwtUserPayload } from '../auth/types/jwt-user-payload.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateEntryDto } from './dto/create-entry.dto';
import { CreatePoolDto } from './dto/create-pool.dto';
import { JoinPoolDto } from './dto/join-pool.dto';
import { ListPoolsDto } from './dto/list-pools.dto';
import { UpdatePoolScoringDto } from './dto/update-pool-scoring.dto';
import { UpsertTournamentPredictionDto } from './dto/upsert-tournament-prediction.dto';
import { PoolsService } from './pools.service';

@Controller('pools')
export class PoolsController {
  constructor(private readonly poolsService: PoolsService) {}

  @Post()
  async createPool(@CurrentUser() user: JwtUserPayload, @Body() dto: CreatePoolDto) {
    return this.poolsService.createPool(user, dto);
  }

  @Get()
  async listRelevantPools(@CurrentUser() user: JwtUserPayload, @Query() query: ListPoolsDto) {
    return this.poolsService.listRelevantPools(user, query);
  }

  @Get('me/main')
  async getOrJoinMainPool(@CurrentUser() user: JwtUserPayload) {
    return this.poolsService.getOrJoinMainPool(user);
  }

  @Get('me/main/tournament-prediction')
  async getMainTournamentPrediction(@CurrentUser() user: JwtUserPayload) {
    return this.poolsService.getMainTournamentPrediction(user);
  }

  @Put('me/main/tournament-prediction')
  async upsertMainTournamentPrediction(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UpsertTournamentPredictionDto,
  ) {
    return this.poolsService.upsertMainTournamentPrediction(user, dto);
  }

  @Get(':poolId')
  async getPoolDetail(@Param('poolId') poolId: string, @CurrentUser() user: JwtUserPayload) {
    return this.poolsService.getPoolDetail(poolId, user);
  }

  @Get(':poolId/highlights/latest-match')
  async getLatestMatchHighlights(@Param('poolId') poolId: string, @CurrentUser() user: JwtUserPayload) {
    return this.poolsService.getLatestMatchHighlights(poolId, user);
  }

  @Get(':poolId/matches/list')
  async listPoolMatchesLite(@Param('poolId') poolId: string, @CurrentUser() user: JwtUserPayload) {
    return this.poolsService.listPoolMatchesLite(poolId, user);
  }

  @Get(':poolId/matches')
  async listPoolMatches(@Param('poolId') poolId: string, @CurrentUser() user: JwtUserPayload) {
    return this.poolsService.listPoolMatches(poolId, user);
  }

  @Post('join')
  async joinPool(@CurrentUser() user: JwtUserPayload, @Body() dto: JoinPoolDto) {
    return this.poolsService.joinPool(user, dto);
  }

  @Get(':poolId/membership/me')
  async getMyMembership(@Param('poolId') poolId: string, @CurrentUser() user: JwtUserPayload) {
    return this.poolsService.getMyMembership(poolId, user);
  }

  @Post(':poolId/entries')
  async createMyEntry(
    @Param('poolId') poolId: string,
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: CreateEntryDto,
  ) {
    return this.poolsService.createMyEntry(poolId, user, dto);
  }

  @Get(':poolId/entries/mine')
  async listMyEntries(@Param('poolId') poolId: string, @CurrentUser() user: JwtUserPayload) {
    return this.poolsService.listMyEntries(poolId, user);
  }

  @Patch(':poolId/scoring-config')
  async updateScoring(
    @Param('poolId') poolId: string,
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UpdatePoolScoringDto,
  ) {
    return this.poolsService.updatePoolScoring(poolId, user, dto);
  }
}
