-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "EventType" ADD VALUE 'YANDEX_CONNECTED';
ALTER TYPE "EventType" ADD VALUE 'YANDEX_DISCONNECTED';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "yandexAccessToken" TEXT,
ADD COLUMN     "yandexLogin" TEXT,
ADD COLUMN     "yandexRefreshToken" TEXT,
ADD COLUMN     "yandexTokenExpiresAt" TIMESTAMP(3);
