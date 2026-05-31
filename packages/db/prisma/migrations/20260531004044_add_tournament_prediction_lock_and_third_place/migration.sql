-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "actualChampionTournamentTeamId" TEXT,
ADD COLUMN     "actualGoldenBallTournamentPlayerId" TEXT,
ADD COLUMN     "actualGoldenGloveTournamentPlayerId" TEXT,
ADD COLUMN     "actualRunnerUpTournamentTeamId" TEXT,
ADD COLUMN     "actualThirdPlaceTournamentTeamId" TEXT,
ADD COLUMN     "actualTopScorerTournamentPlayerId" TEXT,
ADD COLUMN     "tournamentPredictionsLockAt" TIMESTAMP(3),
ADD COLUMN     "tournamentPredictionsLocked" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TournamentPrediction" ADD COLUMN     "thirdPlaceTournamentTeamId" TEXT;

-- CreateIndex
CREATE INDEX "TournamentPrediction_thirdPlaceTournamentTeamId_idx" ON "TournamentPrediction"("thirdPlaceTournamentTeamId");

-- AddForeignKey
ALTER TABLE "TournamentPrediction" ADD CONSTRAINT "TournamentPrediction_thirdPlaceTournamentTeamId_fkey" FOREIGN KEY ("thirdPlaceTournamentTeamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
