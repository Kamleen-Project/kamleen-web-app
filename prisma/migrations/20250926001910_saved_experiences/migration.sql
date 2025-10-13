/*
  Warnings:

  - You are about to drop the `UserSavedExperience` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."UserSavedExperience" DROP CONSTRAINT "UserSavedExperience_experienceId_fkey";

-- DropForeignKey
ALTER TABLE "public"."UserSavedExperience" DROP CONSTRAINT "UserSavedExperience_userId_fkey";

-- DropTable
DROP TABLE "public"."UserSavedExperience";

-- CreateTable
CREATE TABLE "public"."_SavedExperiences" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SavedExperiences_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_SavedExperiences_B_index" ON "public"."_SavedExperiences"("B");

-- AddForeignKey
ALTER TABLE "public"."_SavedExperiences" ADD CONSTRAINT "_SavedExperiences_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_SavedExperiences" ADD CONSTRAINT "_SavedExperiences_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
