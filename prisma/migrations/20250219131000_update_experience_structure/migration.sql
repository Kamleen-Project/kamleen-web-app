-- AlterTable
ALTER TABLE "Experience" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'general';
ALTER TABLE "Experience" ADD COLUMN     "meetingAddress" TEXT;
ALTER TABLE "Experience" ADD COLUMN     "meetingCity" TEXT;
ALTER TABLE "Experience" ADD COLUMN     "meetingCountry" TEXT;
ALTER TABLE "Experience" ADD COLUMN     "meetingLatitude" DECIMAL(10,7);
ALTER TABLE "Experience" ADD COLUMN     "meetingLongitude" DECIMAL(10,7);

-- AlterTable
ALTER TABLE "ExperienceSession" ADD COLUMN     "locationLabel" TEXT;
ALTER TABLE "ExperienceSession" ADD COLUMN     "meetingAddress" TEXT;

-- CreateTable
CREATE TABLE "ExperienceItineraryStep" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "image" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExperienceItineraryStep_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExperienceItineraryStep_experienceId_order_idx" ON "ExperienceItineraryStep"("experienceId", "order");

-- AddForeignKey
ALTER TABLE "ExperienceItineraryStep" ADD CONSTRAINT "ExperienceItineraryStep_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;
