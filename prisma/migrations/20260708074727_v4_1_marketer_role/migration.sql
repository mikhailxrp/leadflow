-- CreateEnum
CREATE TYPE "PlatformRole" AS ENUM ('SUPER_ADMIN', 'MARKETER');

-- CreateEnum
CREATE TYPE "LeadQualification" AS ENUM ('QUALIFIED', 'DISQUALIFIED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'COMPANY_ACCESS_GRANTED';
ALTER TYPE "EventType" ADD VALUE 'COMPANY_ACCESS_REVOKED';
ALTER TYPE "EventType" ADD VALUE 'MARKETER_ACCESS_STARTED';
ALTER TYPE "EventType" ADD VALUE 'MARKETER_ACCESS_ENDED';
ALTER TYPE "EventType" ADD VALUE 'LEAD_QUALIFIED';
ALTER TYPE "EventType" ADD VALUE 'LEAD_DISQUALIFIED';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "blockedByMarketerCascade" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdByPlatformAdminId" TEXT;

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "qualification" "LeadQualification",
ADD COLUMN     "qualifiedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "PlatformAdmin" ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ADD COLUMN     "role" "PlatformRole" NOT NULL DEFAULT 'SUPER_ADMIN';

-- CreateTable
CREATE TABLE "CompanyAccessGrant" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "platformAdminId" TEXT NOT NULL,
    "grantedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyAccessGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyAccessGrant_platformAdminId_idx" ON "CompanyAccessGrant"("platformAdminId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyAccessGrant_companyId_platformAdminId_key" ON "CompanyAccessGrant"("companyId", "platformAdminId");

-- CreateIndex
CREATE INDEX "Company_createdByPlatformAdminId_idx" ON "Company"("createdByPlatformAdminId");

-- AddForeignKey
ALTER TABLE "CompanyAccessGrant" ADD CONSTRAINT "CompanyAccessGrant_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
