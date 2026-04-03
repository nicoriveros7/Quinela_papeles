import { IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';

export class UpdatePoolScoringDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  pointsExactScore?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  pointsMatchOutcome?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  pointsBonusCorrect?: number;

  @IsOptional()
  @IsObject()
  pointsConfig?: Record<string, unknown>;
}
