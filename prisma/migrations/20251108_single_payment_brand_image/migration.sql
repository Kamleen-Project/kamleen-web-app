-- Ensure PaymentSettings has a single brand logo column
ALTER TABLE "PaymentSettings"
ADD COLUMN IF NOT EXISTS "paymentBrandImageUrl" TEXT;

-- Drop any previously created per-method columns if they exist
ALTER TABLE "PaymentSettings"
DROP COLUMN IF EXISTS "cardBrandImageUrl",
DROP COLUMN IF EXISTS "paypalBrandImageUrl",
DROP COLUMN IF EXISTS "applePayBrandImageUrl";





