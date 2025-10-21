-- CreateEnum for ticket status
CREATE TYPE "public"."TicketStatus" AS ENUM ('VALID', 'USED', 'CANCELLED');

-- CreateTable Ticket
CREATE TABLE "public"."Ticket" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "experienceId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "explorerId" TEXT NOT NULL,
  "seatNumber" INTEGER NOT NULL,
  "status" "public"."TicketStatus" NOT NULL DEFAULT 'VALID',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "Ticket_code_key" ON "public"."Ticket"("code");
CREATE INDEX "Ticket_bookingId_idx" ON "public"."Ticket"("bookingId");
CREATE INDEX "Ticket_explorerId_createdAt_idx" ON "public"."Ticket"("explorerId", "createdAt");
CREATE INDEX "Ticket_experienceId_idx" ON "public"."Ticket"("experienceId");
CREATE INDEX "Ticket_sessionId_idx" ON "public"."Ticket"("sessionId");

-- FKs
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "public"."ExperienceBooking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "public"."Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "public"."ExperienceSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Ticket" ADD CONSTRAINT "Ticket_explorerId_fkey" FOREIGN KEY ("explorerId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "public"."TicketTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketTemplate_isActive_idx" ON "public"."TicketTemplate"("isActive");


