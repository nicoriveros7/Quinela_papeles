-- Persist stable venue slug for idempotent seeding and references.
ALTER TABLE "Venue"
  ADD COLUMN "slug" TEXT;

-- Backfill existing rows with a deterministic slug from name.
UPDATE "Venue"
SET "slug" = lower(regexp_replace("name", '[^a-zA-Z0-9]+', '-', 'g'))
WHERE "slug" IS NULL;

CREATE UNIQUE INDEX "Venue_slug_key" ON "Venue"("slug");
