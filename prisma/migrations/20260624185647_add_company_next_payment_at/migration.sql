-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'COMPANY_PAYMENT_UPDATED';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "nextPaymentAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Company_nextPaymentAt_idx" ON "Company"("nextPaymentAt");
