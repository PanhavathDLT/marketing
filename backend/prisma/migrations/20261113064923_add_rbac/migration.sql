-- AlterTable
ALTER TABLE "User" ADD COLUMN     "staffRoleId" INTEGER;

-- CreateTable
CREATE TABLE "StaffRole" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffRolePermission" (
    "id" SERIAL NOT NULL,
    "staffRoleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,

    CONSTRAINT "StaffRolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffRole_name_key" ON "StaffRole"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_module_action_key" ON "Permission"("module", "action");

-- CreateIndex
CREATE UNIQUE INDEX "StaffRolePermission_staffRoleId_permissionId_key" ON "StaffRolePermission"("staffRoleId", "permissionId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_staffRoleId_fkey" FOREIGN KEY ("staffRoleId") REFERENCES "StaffRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRolePermission" ADD CONSTRAINT "StaffRolePermission_staffRoleId_fkey" FOREIGN KEY ("staffRoleId") REFERENCES "StaffRole"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffRolePermission" ADD CONSTRAINT "StaffRolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
