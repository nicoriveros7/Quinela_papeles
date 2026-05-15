import { Controller, Get, Param } from '@nestjs/common';

import { JwtUserPayload } from '../auth/types/jwt-user-payload.type';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PredictionsService } from './predictions.service';

@Controller('pools/:poolId/entries/:entryId')
export class EntryBreakdownController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Get('breakdown')
  async getEntryBreakdown(
    @Param('poolId') poolId: string,
    @Param('entryId') entryId: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    return this.predictionsService.getEntryBreakdown(poolId, entryId, user);
  }
}
