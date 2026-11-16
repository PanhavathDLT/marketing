-- Rename MissionType enum values to raw event names
ALTER TYPE "MissionType" RENAME VALUE 'FIRST_LOAN_APPLICATION' TO 'LOAN_APPLICATION';
ALTER TYPE "MissionType" RENAME VALUE 'FIRST_LOAN_APPROVAL' TO 'LOAN_APPROVAL';
ALTER TYPE "MissionType" RENAME VALUE 'FIRST_REPAYMENT' TO 'REPAYMENT';
-- REFERRAL is unchanged

-- Add requiredCount to Mission (default 1 = existing missions still work as single-trigger)
ALTER TABLE "Mission" ADD COLUMN "requiredCount" INTEGER NOT NULL DEFAULT 1;

-- Add progress to CustomerMission
ALTER TABLE "CustomerMission" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;

-- Backfill progress for already-completed missions so progress = requiredCount
UPDATE "CustomerMission" cm
SET "progress" = m."requiredCount"
FROM "Mission" m
WHERE cm."missionId" = m."id"
  AND cm."status" IN ('CLAIMABLE', 'CLAIMED');
