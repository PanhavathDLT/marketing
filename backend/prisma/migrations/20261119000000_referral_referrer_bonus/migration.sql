-- Add referrerBonus to ReferralConfig
ALTER TABLE "ReferralConfig" ADD COLUMN "referrerBonus" INTEGER NOT NULL DEFAULT 0;
