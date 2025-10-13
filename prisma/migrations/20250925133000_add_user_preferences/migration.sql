-- AlterTable
ALTER TABLE "public"."User"
ADD COLUMN     "preferredLanguage" TEXT NOT NULL DEFAULT 'en',
ADD COLUMN     "preferredCurrency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "preferredTimezone" TEXT NOT NULL DEFAULT 'UTC';

