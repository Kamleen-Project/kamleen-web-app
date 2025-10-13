-- CreateEnum
CREATE TYPE "public"."ExperienceBookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."ExperienceBooking" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "explorerId" TEXT NOT NULL,
    "guests" INTEGER NOT NULL,
    "status" "public"."ExperienceBookingStatus" NOT NULL DEFAULT 'PENDING',
    "totalPrice" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperienceBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExperienceBooking_experienceId_idx" ON "public"."ExperienceBooking"("experienceId");

-- CreateIndex
CREATE INDEX "ExperienceBooking_sessionId_idx" ON "public"."ExperienceBooking"("sessionId");

-- CreateIndex
CREATE INDEX "ExperienceBooking_explorerId_idx" ON "public"."ExperienceBooking"("explorerId");

-- AddForeignKey
ALTER TABLE "public"."ExperienceBooking" ADD CONSTRAINT "ExperienceBooking_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExperienceBooking" ADD CONSTRAINT "ExperienceBooking_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."ExperienceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ExperienceBooking" ADD CONSTRAINT "ExperienceBooking_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
