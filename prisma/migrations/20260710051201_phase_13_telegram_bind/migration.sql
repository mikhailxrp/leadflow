-- AlterTable
ALTER TABLE "User" ADD COLUMN     "telegramBindTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "telegramBindTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramBindTokenHash_key" ON "User"("telegramBindTokenHash");
