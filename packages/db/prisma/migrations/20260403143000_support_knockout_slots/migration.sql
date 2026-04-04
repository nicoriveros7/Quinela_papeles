-- Support knockout bracket slots where concrete teams are not known yet.
ALTER TABLE "Match"
  ADD COLUMN "homeSlotLabel" TEXT,
  ADD COLUMN "awaySlotLabel" TEXT;

ALTER TABLE "Match"
  ALTER COLUMN "homeTournamentTeamId" DROP NOT NULL,
  ALTER COLUMN "awayTournamentTeamId" DROP NOT NULL;
