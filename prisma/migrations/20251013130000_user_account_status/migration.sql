-- CreateEnum
CREATE TYPE "public"."AccountStatus" AS ENUM ('PENDING_VERIFICATION', 'ONBOARDING', 'ACTIVE', 'INACTIVE', 'BANNED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "public"."User" ADD COLUMN     "accountStatus" "public"."AccountStatus" NOT NULL DEFAULT 'PENDING_VERIFICATION';

-- CreateIndex
CREATE INDEX "User_accountStatus_idx" ON "public"."User"("accountStatus");


