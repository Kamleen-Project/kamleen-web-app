-- Create new enum values for ExperienceStatus
DO $$ BEGIN
  CREATE TYPE "public"."ExperienceStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'UNLISTED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- If enum already existed with fewer values, add missing ones
DO $$ BEGIN
  ALTER TYPE "public"."ExperienceStatus" ADD VALUE IF NOT EXISTS 'UNPUBLISHED';
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TYPE "public"."ExperienceStatus" ADD VALUE IF NOT EXISTS 'UNLISTED';
EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN
  ALTER TYPE "public"."ExperienceStatus" ADD VALUE IF NOT EXISTS 'ARCHIVED';
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create verification enum
DO $$ BEGIN
  CREATE TYPE "public"."ExperienceVerificationStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add verificationStatus column if not exists
ALTER TABLE "public"."Experience"
  ADD COLUMN IF NOT EXISTS "verificationStatus" "public"."ExperienceVerificationStatus" NOT NULL DEFAULT 'NOT_SUBMITTED';

-- Ensure status column exists with default; if missing from older migrations
ALTER TABLE "public"."Experience"
  ADD COLUMN IF NOT EXISTS "status" "public"."ExperienceStatus" NOT NULL DEFAULT 'PUBLISHED';

-- Indexes
CREATE INDEX IF NOT EXISTS "Experience_verificationStatus_idx" ON "public"."Experience" ("verificationStatus");
CREATE INDEX IF NOT EXISTS "Experience_status_idx" ON "public"."Experience" ("status");

