-- Add PAYPAL to PaymentProvider enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentProvider' AND e.enumlabel = 'PAYPAL'
  ) THEN
    ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'PAYPAL';
  END IF;
END$$;


