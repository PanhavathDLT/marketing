-- CreateTable
CREATE TABLE "PartnerCode" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "channel" TEXT,
    "note" TEXT,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerCodeUsage" (
    "id" SERIAL NOT NULL,
    "partnerCodeId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerCodeUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerConversion" (
    "id" SERIAL NOT NULL,
    "partnerCodeId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerConversion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerCode_code_key" ON "PartnerCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerCodeUsage_customerId_key" ON "PartnerCodeUsage"("customerId");

-- AddForeignKey
ALTER TABLE "PartnerCodeUsage" ADD CONSTRAINT "PartnerCodeUsage_partnerCodeId_fkey" FOREIGN KEY ("partnerCodeId") REFERENCES "PartnerCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerCodeUsage" ADD CONSTRAINT "PartnerCodeUsage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "CustomerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerConversion" ADD CONSTRAINT "PartnerConversion_partnerCodeId_fkey" FOREIGN KEY ("partnerCodeId") REFERENCES "PartnerCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
