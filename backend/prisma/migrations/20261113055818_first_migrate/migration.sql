-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MissionType" AS ENUM ('REFERRAL', 'FIRST_LOAN_APPLICATION', 'FIRST_LOAN_APPROVAL', 'FIRST_REPAYMENT');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('IN_PROGRESS', 'CLAIMABLE', 'CLAIMED');

-- CreateEnum
CREATE TYPE "PointsSource" AS ENUM ('MISSION', 'CHECK_IN', 'REDEEM', 'REFERRAL', 'EXPIRE');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING_PICKUP', 'COLLECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "points" INTEGER NOT NULL DEFAULT 0,
    "tier" "Tier" NOT NULL DEFAULT 'BRONZE',
    "lastCheckInDate" DATE,
    "currentStreakDay" INTEGER NOT NULL DEFAULT 0,
    "referralCode" TEXT NOT NULL,
    "referredById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mission" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "type" "MissionType" NOT NULL,
    "title" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "iconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerMission" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "missionId" INTEGER NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "checkInDate" DATE NOT NULL,
    "day" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsHistory" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "source" "PointsSource" NOT NULL,
    "missionType" "MissionType",
    "title" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardItem" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "imageUrl" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redemption" (
    "id" SERIAL NOT NULL,
    "customerId" INTEGER NOT NULL,
    "rewardItemId" INTEGER NOT NULL,
    "points" INTEGER NOT NULL,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING_PICKUP',
    "idempotencyKey" TEXT,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerMission_customerId_missionId_key" ON "CustomerMission"("customerId", "missionId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_customerId_checkInDate_key" ON "CheckIn"("customerId", "checkInDate");

-- CreateIndex
CREATE UNIQUE INDEX "Redemption_idempotencyKey_key" ON "Redemption"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMission" ADD CONSTRAINT "CustomerMission_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMission" ADD CONSTRAINT "CustomerMission_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsHistory" ADD CONSTRAINT "PointsHistory_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_rewardItemId_fkey" FOREIGN KEY ("rewardItemId") REFERENCES "RewardItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
