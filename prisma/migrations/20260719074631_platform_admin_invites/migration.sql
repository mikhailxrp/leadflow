-- AlterTable
ALTER TABLE "PlatformAdmin" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "PlatformAdminInvite" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAdminInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdminInvite_tokenHash_key" ON "PlatformAdminInvite"("tokenHash");

-- CreateIndex
CREATE INDEX "PlatformAdminInvite_adminId_idx" ON "PlatformAdminInvite"("adminId");

-- AddForeignKey
ALTER TABLE "PlatformAdminInvite" ADD CONSTRAINT "PlatformAdminInvite_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "PlatformAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
