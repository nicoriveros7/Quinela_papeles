import { Module } from '@nestjs/common';

import { EntryBreakdownController } from './entry-breakdown.controller';
import { PredictionsController } from './predictions.controller';
import { PredictionsService } from './predictions.service';

@Module({
  controllers: [PredictionsController, EntryBreakdownController],
  providers: [PredictionsService],
})
export class PredictionsModule {}