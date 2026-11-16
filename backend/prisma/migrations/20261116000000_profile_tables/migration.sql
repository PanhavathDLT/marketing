-- CreateTable CustomerProfile
CREATE TABLE "CustomerProfile" (
  "id"               SERIAL NOT NULL,
  "userId"           INTEGER NOT NULL,
  "losUserId"        INTEGER,
  "name"             TEXT,
  "phone"            TEXT,
  "points"           INTEGER NOT NULL DEFAULT 0,
  "tier"             TEXT NOT NULL DEFAULT 'BRONZE',
  "lastCheckInDate"  DATE,
  "currentStreakDay"  INTEGER NOT NULL DEFAULT 0,
  "referralCode"     TEXT NOT NULL,
  "referredById"     INTEGER,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomerProfile_userId_key" ON "CustomerProfile"("userId");
CREATE UNIQUE INDEX "CustomerProfile_losUserId_key" ON "CustomerProfile"("losUserId");
CREATE UNIQUE INDEX "CustomerProfile_phone_key" ON "CustomerProfile"("phone");
CREATE UNIQUE INDEX "CustomerProfile_referralCode_key" ON "CustomerProfile"("referralCode");

-- CreateTable StaffProfile
CREATE TABLE "StaffProfile" (
  "id"          SERIAL NOT NULL,
  "userId"      INTEGER NOT NULL,
  "email"       TEXT NOT NULL,
  "password"    TEXT NOT NULL,
  "name"        TEXT,
  "staffRoleId" INTEGER,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "StaffProfile_userId_key" ON "StaffProfile"("userId");
CREATE UNIQUE INDEX "StaffProfile_email_key" ON "StaffProfile"("email");

-- CreateTable RefreshToken
CREATE TABLE "RefreshToken" (
  "id"        SERIAL NOT NULL,
  "userId"    INTEGER NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- Migrate existing customer data into CustomerProfile (without referredById first)
INSERT INTO "CustomerProfile" ("userId","losUserId","name","phone","points","tier","lastCheckInDate","currentStreakDay","referralCode","updatedAt")
SELECT "id","losUserId","name","phone","points","tier","lastCheckInDate","currentStreakDay","referralCode",NOW()
FROM "User" WHERE "role" = 'CUSTOMER';

-- Backfill referredById: User.referredById (User.id) → CustomerProfile.referredById (CustomerProfile.id)
UPDATE "CustomerProfile" cp
SET "referredById" = (
  SELECT cp2."id" FROM "CustomerProfile" cp2
  WHERE cp2."userId" = (SELECT u."referredById" FROM "User" u WHERE u."id" = cp."userId")
)
WHERE (SELECT u."referredById" FROM "User" u WHERE u."id" = cp."userId") IS NOT NULL;

-- Migrate existing staff data into StaffProfile
INSERT INTO "StaffProfile" ("userId","email","password","name","staffRoleId","updatedAt")
SELECT "id","email","password","name","staffRoleId",NOW()
FROM "User" WHERE "role" = 'ADMIN' AND "email" IS NOT NULL AND "password" IS NOT NULL;

-- Add FK constraints
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_userId_fkey"    FOREIGN KEY ("userId")    REFERENCES "User"("id")            ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerProfile" ADD CONSTRAINT "CustomerProfile_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "CustomerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StaffProfile"    ADD CONSTRAINT "StaffProfile_userId_fkey"       FOREIGN KEY ("userId")    REFERENCES "User"("id")            ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StaffProfile"    ADD CONSTRAINT "StaffProfile_staffRoleId_fkey"  FOREIGN KEY ("staffRoleId") REFERENCES "StaffRole"("id")     ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RefreshToken"    ADD CONSTRAINT "RefreshToken_userId_fkey"       FOREIGN KEY ("userId")    REFERENCES "User"("id")            ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop old columns from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "email";
ALTER TABLE "User" DROP COLUMN IF EXISTS "password";
ALTER TABLE "User" DROP COLUMN IF EXISTS "losUserId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "name";
ALTER TABLE "User" DROP COLUMN IF EXISTS "phone";
ALTER TABLE "User" DROP COLUMN IF EXISTS "staffRoleId";
ALTER TABLE "User" DROP COLUMN IF EXISTS "points";
ALTER TABLE "User" DROP COLUMN IF EXISTS "tier";
ALTER TABLE "User" DROP COLUMN IF EXISTS "lastCheckInDate";
ALTER TABLE "User" DROP COLUMN IF EXISTS "currentStreakDay";
ALTER TABLE "User" DROP COLUMN IF EXISTS "referralCode";
ALTER TABLE "User" DROP COLUMN IF EXISTS "referredById";
