import { Body, Controller, Get, Param, Put } from '@nestjs/common';

import { JwtUserPayload } from '../auth/types/jwt-user-payload.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpsertMatchPredictionDto } from './dto/upsert-match-prediction.dto';
import { UpsertMatchQuestionPredictionDto } from './dto/upsert-match-question-prediction.dto';
import { PredictionsService } from './predictions.service';

@Controller('pools/:poolId/entries/:entryId/predictions')
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Put('matches/:matchId')
  async upsertMatchPrediction(
    @Param('poolId') poolId: string,
    @Param('entryId') entryId: string,
    @Param('matchId') matchId: string,
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UpsertMatchPredictionDto,
  ) {
    return this.predictionsService.upsertMatchPrediction(poolId, entryId, matchId, user, dto);
  }

  @Put('questions/:questionId')
  async upsertMatchQuestionPrediction(
    @Param('poolId') poolId: string,
    @Param('entryId') entryId: string,
    @Param('questionId') questionId: string,
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UpsertMatchQuestionPredictionDto,
  ) {
    return this.predictionsService.upsertMatchQuestionPrediction(
      poolId,
      entryId,
      questionId,
      user,
      dto,
    );
  }

  @Get('matches/:matchId')
  async getEntryMatchPredictions(
    @Param('poolId') poolId: string,
    @Param('entryId') entryId: string,
    @Param('matchId') matchId: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.predictionsService.getEntryMatchPredictions(poolId, entryId, matchId, user);
  }
}
