-- CreateTable TierConfig (idempotent)
CREATE TABLE IF NOT EXISTS "TierConfig" (
    "id"        SERIAL NOT NULL,
    "name"      TEXT NOT NULL,
    "minPoints" INTEGER NOT NULL DEFAULT 0,
    "iconUrl"   TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TierConfig_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TierConfig_name_key" ON "TierConfig"("name");

-- Change User.tier from Tier enum to TEXT
-- Drop the default first (it references the enum type), then alter, then restore default, then drop enum
ALTER TABLE "User" ALTER COLUMN "tier" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "tier" TYPE TEXT USING "tier"::TEXT;
ALTER TABLE "User" ALTER COLUMN "tier" SET DEFAULT 'BRONZE';
DROP TYPE IF EXISTS "Tier";
