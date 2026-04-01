import { Controller, Get, Param, Post } from '@nestjs/common';

import { JwtUserPayload } from '../auth/types/jwt-user-payload.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ScoringService } from './scoring.service';

@Controller('pools/:poolId')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Get('leaderboard')
  async getLeaderboard(@Param('poolId') poolId: string, @CurrentUser() user: JwtUserPayload) {
    return this.scoringService.getPoolLeaderboard(poolId, user);
  }

  @Post('scoring/recalculate')
  async recalculatePool(@Param('poolId') poolId: string, @CurrentUser() user: JwtUserPayload) {
    return this.scoringService.recalculatePool(poolId, user);
  }

  @Post('scoring/matches/:matchId/recalculate')
  async recalculateMatch(
    @Param('poolId') poolId: string,
    @Param('matchId') matchId: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.scoringService.recalculateMatchPredictions(poolId, matchId, user);
  }

  @Post('scoring/questions/:questionId/recalculate')
  async recalculateQuestion(
    @Param('poolId') poolId: string,
    @Param('questionId') questionId: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.scoringService.recalculateQuestionPredictions(poolId, questionId, user);
  }
}
