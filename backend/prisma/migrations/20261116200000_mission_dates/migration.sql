-- Move startDate/endDate from Campaign to Mission
-- Campaign status becomes computed (no stored column)

-- 1. Drop status and date columns from Campaign
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "status";
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "startDate";
ALTER TABLE "Campaign" DROP COLUMN IF EXISTS "endDate";

-- 2. Drop CampaignStatus enum (no longer needed)
DROP TYPE IF EXISTS "CampaignStatus";

-- 3. Add date columns to Mission (nullable first to handle existing rows)
ALTER TABLE "Mission" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3);
ALTER TABLE "Mission" ADD COLUMN IF NOT EXISTS "endDate" TIMESTAMP(3);

-- 4. Back-fill existing missions with a sensible default so NOT NULL can be enforced
--    Adjust these defaults if you have real data to preserve
UPDATE "Mission"
SET
  "startDate" = NOW(),
  "endDate"   = NOW() + INTERVAL '30 days'
WHERE "startDate" IS NULL;

-- 5. Enforce NOT NULL
ALTER TABLE "Mission" ALTER COLUMN "startDate" SET NOT NULL;
ALTER TABLE "Mission" ALTER COLUMN "endDate"   SET NOT NULL;
