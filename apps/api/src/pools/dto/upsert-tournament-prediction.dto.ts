import { IsOptional, IsString } from 'class-validator';

export class UpsertTournamentPredictionDto {
  @IsOptional()
  @IsString()
  championTournamentTeamId?: string | null;

  @IsOptional()
  @IsString()
  runnerUpTournamentTeamId?: string | null;

  @IsOptional()
  @IsString()
  thirdPlaceTournamentTeamId?: string | null;

  @IsOptional()
  @IsString()
  topScorerTournamentPlayerId?: string | null;

  @IsOptional()
  @IsString()
  goldenBallTournamentPlayerId?: string | null;

  @IsOptional()
  @IsString()
  goldenGloveTournamentPlayerId?: string | null;
}
