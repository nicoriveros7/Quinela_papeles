import { IsInt, Max, Min } from 'class-validator';

export class UpsertMatchPredictionDto {
  @IsInt()
  @Min(0)
  @Max(30)
  predictedHomeScore!: number;

  @IsInt()
  @Min(0)
  @Max(30)
  predictedAwayScore!: number;
}
