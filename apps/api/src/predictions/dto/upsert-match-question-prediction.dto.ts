import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpsertMatchQuestionPredictionDto {
  @IsOptional()
  @IsString()
  selectedOptionId?: string;

  @IsOptional()
  @IsBoolean()
  selectedBoolean?: boolean;

  @IsOptional()
  @IsString()
  selectedTeamId?: string;

  @IsOptional()
  @IsString()
  selectedPlayerId?: string;

  @IsOptional()
  @IsString()
  selectedTimeRangeKey?: string;
}
