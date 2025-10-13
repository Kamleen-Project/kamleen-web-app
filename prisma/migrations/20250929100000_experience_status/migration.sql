-- Create enum for experience status
DO $$ BEGIN
  CREATE TYPE "public"."ExperienceStatus" AS ENUM ('DRAFT', 'PUBLISHED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add status column to Experience with default PUBLISHED
ALTER TABLE "public"."Experience"
  ADD COLUMN IF NOT EXISTS "status" "public"."ExperienceStatus" NOT NULL DEFAULT 'PUBLISHED';

-- Helpful indexes if needed later (optional)
CREATE INDEX IF NOT EXISTS "Experience_status_idx" ON "public"."Experience" ("status");


