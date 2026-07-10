-- CreateEnum
CREATE TYPE "CompanyLegalForm" AS ENUM ('IP', 'OOO', 'AO', 'PAO', 'NKO', 'SELF_EMPLOYED', 'OTHER');

-- AlterEnum
ALTER TYPE "EventType" ADD VALUE 'COMPANY_PROFILE_UPDATED';

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "address" TEXT,
ADD COLUMN     "directorName" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "legalForm" "CompanyLegalForm",
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "phone" TEXT;
