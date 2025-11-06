-- AlterTable: add slug to ExperienceCategory and backfill from name
ALTER TABLE "public"."ExperienceCategory" ADD COLUMN "slug" TEXT;

-- Backfill slug based on name (lowercased, trimmed, spaces to hyphens, ascii-only)
UPDATE "public"."ExperienceCategory"
SET "slug" = regexp_replace(
  regexp_replace(
    translate(lower(trim("name")),
      'ÀÁÂÃÄÅàáâãäåÒÓÔÕÖØòóôõöøÈÉÊËèéêëÇçÌÍÎÏìíîïÙÚÛÜùúûüÑñÝýÿ',
      'AAAAAAaaaaaaOOOOOOooooooEEEEeeeeCcIIIIiiiiUUUUuuuuNnYyy'
    ),
    '[^a-z0-9\s-]', '', 'g'
  ),
  '[\s_-]+' , '-', 'g'
);

-- Ensure non-null and unique
ALTER TABLE "public"."ExperienceCategory" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "ExperienceCategory_slug_key" ON "public"."ExperienceCategory"("slug");


