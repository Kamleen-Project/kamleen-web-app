-- Add PAYZONE to PaymentProvider enum
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentProvider' AND e.enumlabel = 'PAYZONE'
  ) THEN
    ALTER TYPE "public"."PaymentProvider" ADD VALUE 'PAYZONE';
  END IF;
END $$;

-- Add Payzone columns to PaymentSettings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'PaymentSettings' AND column_name = 'payzoneMerchantId'
  ) THEN
    ALTER TABLE "public"."PaymentSettings" ADD COLUMN "payzoneMerchantId" TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'PaymentSettings' AND column_name = 'payzoneSiteId'
  ) THEN
    ALTER TABLE "public"."PaymentSettings" ADD COLUMN "payzoneSiteId" TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'PaymentSettings' AND column_name = 'payzoneCurrency'
  ) THEN
    ALTER TABLE "public"."PaymentSettings" ADD COLUMN "payzoneCurrency" TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'PaymentSettings' AND column_name = 'payzoneGatewayUrl'
  ) THEN
    ALTER TABLE "public"."PaymentSettings" ADD COLUMN "payzoneGatewayUrl" TEXT;
  END IF;
END $$;


