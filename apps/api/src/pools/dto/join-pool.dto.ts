import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class JoinPoolDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  @MaxLength(16)
  joinCode!: string;
}
