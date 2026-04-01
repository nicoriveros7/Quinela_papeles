import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateEntryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  entryName?: string;
}
