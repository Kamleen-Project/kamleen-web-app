-- Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
    CREATE TYPE "public"."PaymentStatus" AS ENUM ('REQUIRES_PAYMENT_METHOD', 'REQUIRES_ACTION', 'PROCESSING', 'SUCCEEDED', 'CANCELLED', 'REFUNDED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentProvider') THEN
    CREATE TYPE "public"."PaymentProvider" AS ENUM ('STRIPE', 'CMI');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RefundStatus') THEN
    CREATE TYPE "public"."RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'CANCELED');
  END IF;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS "public"."Payment" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "provider" "public"."PaymentProvider" NOT NULL,
  "providerPaymentId" TEXT,
  "amount" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "status" "public"."PaymentStatus" NOT NULL,
  "receiptUrl" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "metadata" JSONB,
  "capturedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "refundedAmount" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Payment_bookingId_idx" ON "public"."Payment" ("bookingId");
CREATE INDEX IF NOT EXISTS "Payment_provider_providerPaymentId_idx" ON "public"."Payment" ("provider", "providerPaymentId");

CREATE TABLE IF NOT EXISTS "public"."Refund" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "reason" TEXT,
  "status" "public"."RefundStatus" NOT NULL DEFAULT 'PENDING',
  "providerRefundId" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Refund_paymentId_idx" ON "public"."Refund" ("paymentId");

CREATE TABLE IF NOT EXISTS "public"."PaymentSettings" (
  "id" TEXT NOT NULL,
  "defaultProvider" "public"."PaymentProvider" NOT NULL DEFAULT 'STRIPE',
  "enabledProviders" "public"."PaymentProvider"[] NOT NULL DEFAULT ARRAY['STRIPE']::"public"."PaymentProvider"[],
  "stripePublishableKey" TEXT,
  "stripeAccountCountry" TEXT,
  "cmiMerchantId" TEXT,
  "cmiTerminalId" TEXT,
  "cmiCurrency" TEXT,
  "testMode" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentSettings_pkey" PRIMARY KEY ("id")
);

-- Columns / Indexes on ExperienceBooking
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ExperienceBooking' AND column_name = 'paymentId'
  ) THEN
    ALTER TABLE "public"."ExperienceBooking" ADD COLUMN "paymentId" TEXT;
  END IF;
END $$;

-- Ensure uniqueness on paymentId (one-to-one primary payment ref)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ExperienceBooking_paymentId_key'
  ) THEN
    CREATE UNIQUE INDEX "ExperienceBooking_paymentId_key" ON "public"."ExperienceBooking" ("paymentId");
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ExperienceBooking' AND column_name = 'paymentStatus'
  ) THEN
    ALTER TABLE "public"."ExperienceBooking" ADD COLUMN "paymentStatus" "public"."PaymentStatus";
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'ExperienceBooking' AND column_name = 'expiresAt'
  ) THEN
    ALTER TABLE "public"."ExperienceBooking" ADD COLUMN "expiresAt" TIMESTAMP(3);
  END IF;
END $$;

-- Index for expirations
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'ExperienceBooking_expiresAt_idx'
  ) THEN
    CREATE INDEX "ExperienceBooking_expiresAt_idx" ON "public"."ExperienceBooking" ("expiresAt");
  END IF;
END $$;

-- Foreign keys
ALTER TABLE "public"."Payment"
  ADD CONSTRAINT "Payment_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "public"."ExperienceBooking"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."Refund"
  ADD CONSTRAINT "Refund_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ExperienceBooking"
  ADD CONSTRAINT "ExperienceBooking_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id")
  ON DELETE NO ACTION ON UPDATE CASCADE;


