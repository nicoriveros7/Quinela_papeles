import { IsString } from 'class-validator';

export class ResolveMatchQuestionDto {
  @IsString()
  correctOptionId!: string;
}
