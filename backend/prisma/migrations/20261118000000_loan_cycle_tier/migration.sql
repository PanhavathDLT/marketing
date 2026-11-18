-- Add loan cycle count to CustomerProfile
ALTER TABLE "CustomerProfile" ADD COLUMN "loanCycleCount" INTEGER NOT NULL DEFAULT 0;

-- Rename minPoints → rewardPoints on TierConfig (now means bonus points on tier-up)
ALTER TABLE "TierConfig" RENAME COLUMN "minPoints" TO "rewardPoints";

-- Add minLoanCount to TierConfig (loan cycles needed to reach this tier)
ALTER TABLE "TierConfig" ADD COLUMN "minLoanCount" INTEGER NOT NULL DEFAULT 0;
