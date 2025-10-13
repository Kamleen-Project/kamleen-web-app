-- Add verificationNote to Experience for admin rejection message
ALTER TABLE "public"."Experience"
  ADD COLUMN IF NOT EXISTS "verificationNote" TEXT;


