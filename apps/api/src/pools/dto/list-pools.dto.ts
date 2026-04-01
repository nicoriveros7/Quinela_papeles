import { IsIn, IsOptional } from 'class-validator';

export class ListPoolsDto {
  @IsOptional()
  @IsIn(['all', 'owned', 'joined'])
  scope?: 'all' | 'owned' | 'joined';
}
