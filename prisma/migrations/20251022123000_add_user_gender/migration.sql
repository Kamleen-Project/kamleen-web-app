-- CreateEnum
CREATE TYPE "public"."Gender" AS ENUM ('MALE', 'FEMALE', 'RATHER_NOT_SAY');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN "gender" "public"."Gender";


