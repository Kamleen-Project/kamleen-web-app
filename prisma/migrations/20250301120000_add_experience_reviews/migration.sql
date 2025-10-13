-- CreateTable
CREATE TABLE "ExperienceReview" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "explorerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExperienceReview_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ExperienceReview"
ADD CONSTRAINT "ExperienceReview_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExperienceReview"
ADD CONSTRAINT "ExperienceReview_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "ExperienceReview_experienceId_idx" ON "ExperienceReview"("experienceId");

CREATE INDEX "ExperienceReview_explorerId_idx" ON "ExperienceReview"("explorerId");
