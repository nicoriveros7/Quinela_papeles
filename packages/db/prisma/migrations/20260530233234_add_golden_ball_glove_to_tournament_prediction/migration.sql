-- AlterTable
ALTER TABLE "TournamentPrediction" ADD COLUMN     "goldenBallTournamentPlayerId" TEXT,
ADD COLUMN     "goldenGloveTournamentPlayerId" TEXT;

-- CreateIndex
CREATE INDEX "TournamentPrediction_goldenBallTournamentPlayerId_idx" ON "TournamentPrediction"("goldenBallTournamentPlayerId");

-- CreateIndex
CREATE INDEX "TournamentPrediction_goldenGloveTournamentPlayerId_idx" ON "TournamentPrediction"("goldenGloveTournamentPlayerId");

-- AddForeignKey
ALTER TABLE "TournamentPrediction" ADD CONSTRAINT "TournamentPrediction_goldenBallTournamentPlayerId_fkey" FOREIGN KEY ("goldenBallTournamentPlayerId") REFERENCES "TournamentPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPrediction" ADD CONSTRAINT "TournamentPrediction_goldenGloveTournamentPlayerId_fkey" FOREIGN KEY ("goldenGloveTournamentPlayerId") REFERENCES "TournamentPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
