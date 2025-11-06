-- Add CASH to PaymentProvider enum
-- PostgreSQL requires creating a new value using ALTER TYPE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'PaymentProvider' AND e.enumlabel = 'CASH'
  ) THEN
    ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'CASH';
  END IF;
END$$;


