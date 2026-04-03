import { QuestionAnswerType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class MatchQuestionOptionInputDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  key!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @IsString()
  teamId?: string;
}

export class CreateMatchQuestionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  key?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(240)
  questionText!: string;

  @IsEnum(QuestionAnswerType)
  answerType!: QuestionAnswerType;

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
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MatchQuestionOptionInputDto)
  options?: MatchQuestionOptionInputDto[];
}
