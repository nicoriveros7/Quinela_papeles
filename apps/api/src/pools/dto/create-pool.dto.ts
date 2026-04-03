import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePoolDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(80)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  slug!: string;

  @IsString()
  @IsNotEmpty()
  tournamentId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(16)
  joinCode?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  lockMinutesBeforeKickoff?: number;

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
}
