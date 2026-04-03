import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { MatchStatus, SystemRole } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';

import { JwtUserPayload } from '../auth/types/jwt-user-payload.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { CreateMatchQuestionDto } from './dto/create-match-question.dto';
import { ResolveMatchQuestionDto } from './dto/resolve-match-question.dto';
import { UpdateMatchQuestionDto } from './dto/update-match-question.dto';

class UpdateMatchResultDto {
  @IsOptional()
  @IsEnum(MatchStatus)
  status?: MatchStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  homeScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  awayScore?: number;
}

@Roles(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('tournaments')
  async listTournaments() {
    return this.adminService.listTournaments();
  }

  @Get('tournaments/:tournamentId/matches')
  async listTournamentMatches(@Param('tournamentId') tournamentId: string) {
    return this.adminService.listTournamentMatches(tournamentId);
  }

  @Get('pools')
  async listPools() {
    return this.adminService.listPools();
  }

  @Get('pools/:poolId/matches')
  async listPoolMatches(@Param('poolId') poolId: string) {
    return this.adminService.listPoolMatches(poolId);
  }

  @Post('pools/:poolId/scoring/recalculate')
  async recalculatePoolScoring(@Param('poolId') poolId: string, @CurrentUser() user: JwtUserPayload) {
    return this.adminService.recalculatePoolScoring(poolId, user);
  }

  @Patch('matches/:matchId/result')
  async updateMatchResult(
    @Param('matchId') matchId: string,
    @Body() dto: UpdateMatchResultDto,
  ) {
    return this.adminService.updateMatchResult(matchId, dto);
  }

  @Get('matches/:matchId/questions')
  async listMatchQuestions(@Param('matchId') matchId: string) {
    return this.adminService.listMatchQuestions(matchId);
  }

  @Post('matches/:matchId/questions')
  async createMatchQuestion(@Param('matchId') matchId: string, @Body() dto: CreateMatchQuestionDto) {
    return this.adminService.createMatchQuestion(matchId, dto);
  }

  @Patch('questions/:questionId')
  async updateMatchQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: UpdateMatchQuestionDto,
  ) {
    return this.adminService.updateMatchQuestion(questionId, dto);
  }

  @Post('questions/:questionId/resolve')
  async resolveMatchQuestion(
    @Param('questionId') questionId: string,
    @Body() dto: ResolveMatchQuestionDto,
  ) {
    return this.adminService.resolveMatchQuestion(questionId, dto);
  }
}
