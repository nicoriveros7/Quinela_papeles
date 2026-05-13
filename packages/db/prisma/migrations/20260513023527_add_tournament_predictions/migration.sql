-- AlterTable
ALTER TABLE "Pool" ADD COLUMN     "pointsChampionCorrect" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "pointsRunnerUpCorrect" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "pointsTopScorerCorrect" INTEGER NOT NULL DEFAULT 3;

-- CreateTable
CREATE TABLE "TournamentPrediction" (
    "id" TEXT NOT NULL,
    "poolEntryId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "championTournamentTeamId" TEXT,
    "runnerUpTournamentTeamId" TEXT,
    "topScorerTournamentPlayerId" TEXT,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isScored" BOOLEAN NOT NULL DEFAULT false,
    "scoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentPrediction_poolEntryId_idx" ON "TournamentPrediction"("poolEntryId");

-- CreateIndex
CREATE INDEX "TournamentPrediction_tournamentId_idx" ON "TournamentPrediction"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentPrediction_championTournamentTeamId_idx" ON "TournamentPrediction"("championTournamentTeamId");

-- CreateIndex
CREATE INDEX "TournamentPrediction_runnerUpTournamentTeamId_idx" ON "TournamentPrediction"("runnerUpTournamentTeamId");

-- CreateIndex
CREATE INDEX "TournamentPrediction_topScorerTournamentPlayerId_idx" ON "TournamentPrediction"("topScorerTournamentPlayerId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPrediction_poolEntryId_tournamentId_key" ON "TournamentPrediction"("poolEntryId", "tournamentId");

-- AddForeignKey
ALTER TABLE "TournamentPrediction" ADD CONSTRAINT "TournamentPrediction_poolEntryId_fkey" FOREIGN KEY ("poolEntryId") REFERENCES "PoolEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPrediction" ADD CONSTRAINT "TournamentPrediction_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPrediction" ADD CONSTRAINT "TournamentPrediction_championTournamentTeamId_fkey" FOREIGN KEY ("championTournamentTeamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPrediction" ADD CONSTRAINT "TournamentPrediction_runnerUpTournamentTeamId_fkey" FOREIGN KEY ("runnerUpTournamentTeamId") REFERENCES "TournamentTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPrediction" ADD CONSTRAINT "TournamentPrediction_topScorerTournamentPlayerId_fkey" FOREIGN KEY ("topScorerTournamentPlayerId") REFERENCES "TournamentPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
