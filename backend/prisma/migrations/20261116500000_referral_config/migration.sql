-- CreateTable
CREATE TABLE "ReferralConfig" (
    "id" SERIAL NOT NULL,
    "refereeBonus" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralConfig_pkey" PRIMARY KEY ("id")
);
