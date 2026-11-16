-- Make email nullable (LOS customers don't have email in marketing system)
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- Make password nullable (LOS customers authenticate via LOS token)
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- Add losUserId to link marketing users back to the LOS backend
ALTER TABLE "User" ADD COLUMN "losUserId" INTEGER;

-- Unique constraint (one LOS user = one marketing account)
CREATE UNIQUE INDEX "User_losUserId_key" ON "User"("losUserId");
