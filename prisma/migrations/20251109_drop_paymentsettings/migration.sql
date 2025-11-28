-- Drop legacy PaymentSettings table if it exists
DO $$ BEGIN
  IF to_regclass('public."PaymentSettings"') IS NOT NULL THEN
    DROP TABLE "PaymentSettings";
  END IF;
END $$;


