-- CreateEnum
CREATE TYPE "TournamentPlayerStatus" AS ENUM ('PROVISIONAL', 'FINAL', 'WITHDRAWN', 'REPLACED');

-- AlterEnum
ALTER TYPE "QuestionAnswerType" ADD VALUE 'PLAYER_PICK';

-- AlterTable
ALTER TABLE "MatchQuestionOption" ADD COLUMN     "playerId" TEXT;

-- AlterTable
ALTER TABLE "MatchQuestionPrediction" ADD COLUMN     "selectedPlayerId" TEXT;

-- CreateTable
CREATE TABLE "Player" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "shortName" TEXT,
    "externalRef" TEXT,
    "birthDate" TIMESTAMP(3),
    "nationalityCode" TEXT,
    "preferredPosition" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentPlayer" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "tournamentTeamId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "shirtNumber" INTEGER,
    "position" TEXT,
    "squadStatus" "TournamentPlayerStatus" NOT NULL DEFAULT 'PROVISIONAL',
    "isCaptain" BOOLEAN NOT NULL DEFAULT false,
    "isGoalkeeper" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_externalRef_key" ON "Player"("externalRef");

-- CreateIndex
CREATE INDEX "Player_fullName_idx" ON "Player"("fullName");

-- CreateIndex
CREATE INDEX "TournamentPlayer_tournamentTeamId_idx" ON "TournamentPlayer"("tournamentTeamId");

-- CreateIndex
CREATE INDEX "TournamentPlayer_playerId_idx" ON "TournamentPlayer"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentPlayer_tournamentId_tournamentTeamId_playerId_key" ON "TournamentPlayer"("tournamentId", "tournamentTeamId", "playerId");

-- CreateIndex
CREATE INDEX "MatchQuestionOption_playerId_idx" ON "MatchQuestionOption"("playerId");

-- CreateIndex
CREATE INDEX "MatchQuestionPrediction_selectedPlayerId_idx" ON "MatchQuestionPrediction"("selectedPlayerId");

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_tournamentTeamId_fkey" FOREIGN KEY ("tournamentTeamId") REFERENCES "TournamentTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentPlayer" ADD CONSTRAINT "TournamentPlayer_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQuestionOption" ADD CONSTRAINT "MatchQuestionOption_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQuestionPrediction" ADD CONSTRAINT "MatchQuestionPrediction_selectedPlayerId_fkey" FOREIGN KEY ("selectedPlayerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
