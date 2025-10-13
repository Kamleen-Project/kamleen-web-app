/*
  Warnings:

  - You are about to drop the column `endAt` on the `ExperienceSession` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."ExperienceSession" DROP COLUMN "endAt",
ADD COLUMN     "duration" TEXT;
