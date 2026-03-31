-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('FOOTBALL');

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MatchStage" AS ENUM ('GROUP', 'KNOCKOUT', 'PLAYOFF', 'FINAL', 'OTHER');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'LIVE', 'FINISHED', 'POSTPONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PoolVisibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "PoolStatus" AS ENUM ('DRAFT', 'ACTIVE', 'LOCKED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PoolRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "PoolMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "PoolEntryStatus" AS ENUM ('ACTIVE', 'LOCKED', 'DISQUALIFIED');

-- CreateEnum
CREATE TYPE "QuestionAnswerType" AS ENUM ('BOOLEAN', 'SINGLE_CHOICE', 'TEAM_PICK', 'TIME_RANGE');

-- CreateEnum
CREATE TYPE "QuestionResolutionMode" AS ENUM ('MANUAL', 'CORRECT_OPTION', 'MATCH_RESULT_DERIVED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'SCORE_RECALCULATED', 'STATUS_CHANGED', 'LOGIN', 'LOGOUT');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('USER', 'TOURNAMENT', 'TEAM', 'MATCH', 'POOL', 'POOL_MEMBER', 'POOL_ENTRY', 'MATCH_PREDICTION', 'MATCH_QUESTION', 'QUESTION_TEMPLATE', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "passwordHash" TEXT,
    "systemRole" "SystemRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "sport" "SportType" NOT NULL DEFAULT 'FOOTBALL',
    "status" "TournamentStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "countryCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentGroup" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentTeam" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "groupId" TEXT,
    "seed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TournamentTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "countryCode" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "groupId" TEXT,
    "homeTournamentTeamId" TEXT NOT NULL,
    "awayTournamentTeamId" TEXT NOT NULL,
    "venueId" TEXT,
    "stage" "MatchStage" NOT NULL DEFAULT 'GROUP',
    "roundLabel" TEXT,
    "matchNumber" INTEGER,
    "kickoffAt" TIMESTAMP(3) NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "homePenaltyScore" INTEGER,
    "awayPenaltyScore" INTEGER,
    "resultConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pool" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "visibility" "PoolVisibility" NOT NULL DEFAULT 'PRIVATE',
    "status" "PoolStatus" NOT NULL DEFAULT 'DRAFT',
    "joinCode" TEXT,
    "maxEntriesPerMember" INTEGER NOT NULL DEFAULT 1,
    "lockMinutesBeforeKickoff" INTEGER NOT NULL DEFAULT 0,
    "pointsExactScore" INTEGER NOT NULL DEFAULT 3,
    "pointsMatchOutcome" INTEGER NOT NULL DEFAULT 1,
    "pointsBonusCorrect" INTEGER NOT NULL DEFAULT 2,
    "pointsConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolMember" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PoolRole" NOT NULL DEFAULT 'MEMBER',
    "status" "PoolMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoolMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoolEntry" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryNumber" INTEGER NOT NULL DEFAULT 1,
    "entryName" TEXT,
    "status" "PoolEntryStatus" NOT NULL DEFAULT 'ACTIVE',
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoolEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchPrediction" (
    "id" TEXT NOT NULL,
    "poolEntryId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "predictedHomeScore" INTEGER NOT NULL,
    "predictedAwayScore" INTEGER NOT NULL,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "isScored" BOOLEAN NOT NULL DEFAULT false,
    "scoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "answerType" "QuestionAnswerType" NOT NULL DEFAULT 'SINGLE_CHOICE',
    "defaultPoints" INTEGER NOT NULL DEFAULT 1,
    "defaultScoringConfig" JSONB,
    "defaultAnswerConfig" JSONB,
    "defaultOptionsConfig" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchQuestion" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "templateId" TEXT,
    "key" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "answerType" "QuestionAnswerType" NOT NULL DEFAULT 'SINGLE_CHOICE',
    "pointsOverride" INTEGER,
    "scoringConfig" JSONB,
    "answerConfig" JSONB,
    "resolutionMode" "QuestionResolutionMode" NOT NULL DEFAULT 'MANUAL',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "lockAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "correctOptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchQuestionOption" (
    "id" TEXT NOT NULL,
    "matchQuestionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "teamId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "optionConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchQuestionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchQuestionPrediction" (
    "id" TEXT NOT NULL,
    "poolEntryId" TEXT NOT NULL,
    "matchQuestionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "selectedBoolean" BOOLEAN,
    "selectedTeamId" TEXT,
    "selectedTimeRangeKey" TEXT,
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "isScored" BOOLEAN NOT NULL DEFAULT false,
    "scoredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchQuestionPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" "AuditEntityType" NOT NULL,
    "entityId" TEXT,
    "tournamentId" TEXT,
    "poolId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_systemRole_idx" ON "User"("systemRole");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_slug_key" ON "Tournament"("slug");

-- CreateIndex
CREATE INDEX "Tournament_status_startDate_idx" ON "Tournament"("status", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Team_code_key" ON "Team"("code");

-- CreateIndex
CREATE INDEX "TournamentGroup_tournamentId_sortOrder_idx" ON "TournamentGroup"("tournamentId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentGroup_tournamentId_code_key" ON "TournamentGroup"("tournamentId", "code");

-- CreateIndex
CREATE INDEX "TournamentTeam_tournamentId_groupId_idx" ON "TournamentTeam"("tournamentId", "groupId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentTeam_tournamentId_teamId_key" ON "TournamentTeam"("tournamentId", "teamId");

-- CreateIndex
CREATE UNIQUE INDEX "Venue_name_city_key" ON "Venue"("name", "city");

-- CreateIndex
CREATE INDEX "Match_tournamentId_kickoffAt_idx" ON "Match"("tournamentId", "kickoffAt");

-- CreateIndex
CREATE INDEX "Match_status_kickoffAt_idx" ON "Match"("status", "kickoffAt");

-- CreateIndex
CREATE INDEX "Match_homeTournamentTeamId_idx" ON "Match"("homeTournamentTeamId");

-- CreateIndex
CREATE INDEX "Match_awayTournamentTeamId_idx" ON "Match"("awayTournamentTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "Match_tournamentId_matchNumber_key" ON "Match"("tournamentId", "matchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Pool_slug_key" ON "Pool"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Pool_joinCode_key" ON "Pool"("joinCode");

-- CreateIndex
CREATE INDEX "Pool_tournamentId_status_idx" ON "Pool"("tournamentId", "status");

-- CreateIndex
CREATE INDEX "Pool_ownerUserId_idx" ON "Pool"("ownerUserId");

-- CreateIndex
CREATE INDEX "PoolMember_userId_status_idx" ON "PoolMember"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PoolMember_poolId_userId_key" ON "PoolMember"("poolId", "userId");

-- CreateIndex
CREATE INDEX "PoolEntry_poolId_totalPoints_idx" ON "PoolEntry"("poolId", "totalPoints");

-- CreateIndex
CREATE INDEX "PoolEntry_userId_idx" ON "PoolEntry"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PoolEntry_poolId_userId_entryNumber_key" ON "PoolEntry"("poolId", "userId", "entryNumber");

-- CreateIndex
CREATE INDEX "MatchPrediction_matchId_idx" ON "MatchPrediction"("matchId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchPrediction_poolEntryId_matchId_key" ON "MatchPrediction"("poolEntryId", "matchId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionTemplate_code_key" ON "QuestionTemplate"("code");

-- CreateIndex
CREATE INDEX "MatchQuestion_matchId_isPublished_idx" ON "MatchQuestion"("matchId", "isPublished");

-- CreateIndex
CREATE INDEX "MatchQuestion_matchId_isResolved_idx" ON "MatchQuestion"("matchId", "isResolved");

-- CreateIndex
CREATE INDEX "MatchQuestion_templateId_idx" ON "MatchQuestion"("templateId");

-- CreateIndex
CREATE INDEX "MatchQuestion_correctOptionId_idx" ON "MatchQuestion"("correctOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchQuestion_matchId_key_key" ON "MatchQuestion"("matchId", "key");

-- CreateIndex
CREATE INDEX "MatchQuestionOption_matchQuestionId_sortOrder_idx" ON "MatchQuestionOption"("matchQuestionId", "sortOrder");

-- CreateIndex
CREATE INDEX "MatchQuestionOption_teamId_idx" ON "MatchQuestionOption"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchQuestionOption_matchQuestionId_key_key" ON "MatchQuestionOption"("matchQuestionId", "key");

-- CreateIndex
CREATE INDEX "MatchQuestionPrediction_matchQuestionId_idx" ON "MatchQuestionPrediction"("matchQuestionId");

-- CreateIndex
CREATE INDEX "MatchQuestionPrediction_selectedOptionId_idx" ON "MatchQuestionPrediction"("selectedOptionId");

-- CreateIndex
CREATE INDEX "MatchQuestionPrediction_selectedTeamId_idx" ON "MatchQuestionPrediction"("selectedTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchQuestionPrediction_poolEntryId_matchQuestionId_key" ON "MatchQuestionPrediction"("poolEntryId", "matchQuestionId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- CreateIndex
CREATE INDEX "AuditLog_tournamentId_idx" ON "AuditLog"("tournamentId");

-- CreateIndex
CREATE INDEX "AuditLog_poolId_idx" ON "AuditLog"("poolId");

-- AddForeignKey
ALTER TABLE "TournamentGroup" ADD CONSTRAINT "TournamentGroup_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentTeam" ADD CONSTRAINT "TournamentTeam_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TournamentGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TournamentGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTournamentTeamId_fkey" FOREIGN KEY ("homeTournamentTeamId") REFERENCES "TournamentTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTournamentTeamId_fkey" FOREIGN KEY ("awayTournamentTeamId") REFERENCES "TournamentTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolMember" ADD CONSTRAINT "PoolMember_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolMember" ADD CONSTRAINT "PoolMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolEntry" ADD CONSTRAINT "PoolEntry_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolEntry" ADD CONSTRAINT "PoolEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoolEntry" ADD CONSTRAINT "PoolEntry_poolId_userId_fkey" FOREIGN KEY ("poolId", "userId") REFERENCES "PoolMember"("poolId", "userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPrediction" ADD CONSTRAINT "MatchPrediction_poolEntryId_fkey" FOREIGN KEY ("poolEntryId") REFERENCES "PoolEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchPrediction" ADD CONSTRAINT "MatchPrediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQuestion" ADD CONSTRAINT "MatchQuestion_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQuestion" ADD CONSTRAINT "MatchQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "QuestionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQuestion" ADD CONSTRAINT "MatchQuestion_correctOptionId_fkey" FOREIGN KEY ("correctOptionId") REFERENCES "MatchQuestionOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQuestionOption" ADD CONSTRAINT "MatchQuestionOption_matchQuestionId_fkey" FOREIGN KEY ("matchQuestionId") REFERENCES "MatchQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQuestionOption" ADD CONSTRAINT "MatchQuestionOption_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQuestionPrediction" ADD CONSTRAINT "MatchQuestionPrediction_poolEntryId_fkey" FOREIGN KEY ("poolEntryId") REFERENCES "PoolEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQuestionPrediction" ADD CONSTRAINT "MatchQuestionPrediction_matchQuestionId_fkey" FOREIGN KEY ("matchQuestionId") REFERENCES "MatchQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQuestionPrediction" ADD CONSTRAINT "MatchQuestionPrediction_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "MatchQuestionOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchQuestionPrediction" ADD CONSTRAINT "MatchQuestionPrediction_selectedTeamId_fkey" FOREIGN KEY ("selectedTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "Pool"("id") ON DELETE SET NULL ON UPDATE CASCADE;
