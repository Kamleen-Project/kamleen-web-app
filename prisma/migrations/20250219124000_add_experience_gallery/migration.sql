-- AlterTable
ALTER TABLE "Experience"
ADD COLUMN     "galleryImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
