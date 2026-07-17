-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'METRIKA_CONNECTED';
ALTER TYPE "EventType" ADD VALUE 'METRIKA_DISCONNECTED';
ALTER TYPE "EventType" ADD VALUE 'LEAD_METRIKA_EXPORTED';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "metrikaAccessToken" TEXT,
ADD COLUMN     "metrikaLogin" TEXT,
ADD COLUMN     "metrikaRefreshToken" TEXT,
ADD COLUMN     "metrikaTokenExpiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "metrikaExportedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Lead_companyId_qualification_metrikaExportedAt_idx" ON "Lead"("companyId", "qualification", "metrikaExportedAt");
