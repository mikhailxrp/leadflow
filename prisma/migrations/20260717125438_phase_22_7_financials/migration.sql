-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'LEAD_DEAL_VALUE_UPDATED';
ALTER TYPE "EventType" ADD VALUE 'AD_SPEND_UPDATED';

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "dealValueEstimated" DECIMAL(14,2),
ADD COLUMN     "dealValueFinal" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "AdSpend" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amountWithVat" DECIMAL(14,2) NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdSpend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdSpend_companyId_idx" ON "AdSpend"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "AdSpend_companyId_year_month_key" ON "AdSpend"("companyId", "year", "month");

-- AddForeignKey
ALTER TABLE "AdSpend" ADD CONSTRAINT "AdSpend_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
