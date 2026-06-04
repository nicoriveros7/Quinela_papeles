-- AlterTable
ALTER TABLE "Pool" ADD COLUMN     "pointsGoldenBallCorrect" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "pointsGoldenGloveCorrect" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "pointsThirdPlaceCorrect" INTEGER NOT NULL DEFAULT 15,
ALTER COLUMN "pointsChampionCorrect" SET DEFAULT 15,
ALTER COLUMN "pointsRunnerUpCorrect" SET DEFAULT 15,
ALTER COLUMN "pointsTopScorerCorrect" SET DEFAULT 10;
