ALTER TABLE "PlatformAdmin"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "PlatformAdminPasswordResetToken" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformAdminPasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformAdminPasswordResetToken_tokenHash_key" ON "PlatformAdminPasswordResetToken"("tokenHash");
CREATE INDEX "PlatformAdminPasswordResetToken_adminId_idx" ON "PlatformAdminPasswordResetToken"("adminId");
CREATE INDEX "PlatformAdminPasswordResetToken_expiresAt_idx" ON "PlatformAdminPasswordResetToken"("expiresAt");

ALTER TABLE "PlatformAdminPasswordResetToken"
ADD CONSTRAINT "PlatformAdminPasswordResetToken_adminId_fkey"
FOREIGN KEY ("adminId") REFERENCES "PlatformAdmin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
