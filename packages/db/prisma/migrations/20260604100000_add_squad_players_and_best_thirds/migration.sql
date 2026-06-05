-- AlterTable "Player" — add official squad detail fields
ALTER TABLE "Player" ADD COLUMN     "firstNames" TEXT;
ALTER TABLE "Player" ADD COLUMN     "lastNames" TEXT;
ALTER TABLE "Player" ADD COLUMN     "nameOnShirt" TEXT;
ALTER TABLE "Player" ADD COLUMN     "club" TEXT;
ALTER TABLE "Player" ADD COLUMN     "heightCm" INTEGER;

-- AlterTable "Pool" — add best thirds scoring columns
ALTER TABLE "Pool" ADD COLUMN     "pointsBestThirdsExact" INTEGER NOT NULL DEFAULT 20;
ALTER TABLE "Pool" ADD COLUMN     "pointsBestThirdsPartial" INTEGER NOT NULL DEFAULT 10;

-- AlterTable "Tournament" — add actual best thirds official result
ALTER TABLE "Tournament" ADD COLUMN     "actualBestThirdsTeamIds" JSONB;

-- AlterTable "TournamentPrediction" — add best thirds user prediction
ALTER TABLE "TournamentPrediction" ADD COLUMN     "bestThirdsTeamIds" JSONB;
