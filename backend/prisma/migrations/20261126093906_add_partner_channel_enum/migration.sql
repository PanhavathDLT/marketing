/*
  Warnings:

  - The `channel` column on the `PartnerCode` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PartnerChannel" AS ENUM ('TIKTOK', 'YOUTUBE', 'FACEBOOK', 'INSTAGRAM', 'TELEGRAM', 'TWITTER', 'LINKEDIN', 'OTHER');

-- AlterTable
ALTER TABLE "PartnerCode" DROP COLUMN "channel",
ADD COLUMN     "channel" "PartnerChannel";
