-- Add brand logo URL fields to PaymentSettings for checkout UI
ALTER TABLE "PaymentSettings"
ADD COLUMN IF NOT EXISTS "cardBrandImageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "paypalBrandImageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "applePayBrandImageUrl" TEXT;


