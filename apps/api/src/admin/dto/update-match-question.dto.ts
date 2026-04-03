import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateMatchQuestionDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(240)
  questionText?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(20)
  pointsOverride?: number;

  @IsOptional()
  @IsISO8601()
  lockAt?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsString()
  correctOptionId?: string;
}
