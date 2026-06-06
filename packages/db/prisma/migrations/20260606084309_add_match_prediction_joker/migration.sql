-- AlterTable
ALTER TABLE "MatchPrediction" ADD COLUMN     "isJoker" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "MatchPrediction_poolEntryId_isJoker_idx" ON "MatchPrediction"("poolEntryId", "isJoker");
