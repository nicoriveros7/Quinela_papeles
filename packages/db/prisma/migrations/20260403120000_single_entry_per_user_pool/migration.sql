-- Enforce one entry per user in each pool.
-- If historical duplicates exist, keep the earliest created entry and remove the rest.
WITH ranked_entries AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY "poolId", "userId"
      ORDER BY "createdAt" ASC, id ASC
    ) AS rn
  FROM "PoolEntry"
), duplicates AS (
  SELECT id
  FROM ranked_entries
  WHERE rn > 1
)
DELETE FROM "PoolEntry"
WHERE id IN (SELECT id FROM duplicates);

CREATE UNIQUE INDEX "PoolEntry_poolId_userId_key"
ON "PoolEntry"("poolId", "userId");
