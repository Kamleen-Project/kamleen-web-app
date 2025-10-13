-- DropIndex
DROP INDEX "public"."Experience_status_idx";

-- AlterTable
ALTER TABLE "public"."Experience" ADD COLUMN     "audience" TEXT NOT NULL DEFAULT 'all';

-- AlterTable
ALTER TABLE "public"."ExperienceItineraryStep" ADD COLUMN     "duration" TEXT;
