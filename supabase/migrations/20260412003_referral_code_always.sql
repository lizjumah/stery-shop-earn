-- ============================================================
-- Ensure every customer always has a unique referral_code
-- ============================================================
--
-- Problem: referral_code is nullable with no default, so rows
-- inserted without a code (the common case) get NULL.
-- The reseller storefront lookups use WHERE referral_code = :code
-- so NULL rows produce "shop not found" for the reseller.
--
-- Fix:
--   1. Backfill existing NULLs from the customer's UUID
--   2. Set NOT NULL on the column
--   3. Add UNIQUE constraint (it's a URL segment / lookup key)
--   4. Add a BEFORE INSERT trigger so new customers always get
--      a code even if the caller doesn't supply one
-- ============================================================

-- ── 1. Backfill all existing NULL rows ───────────────────────
-- Uses the first 8 hex characters of the customer's UUID,
-- uppercased. Derived from the UUID itself so it is effectively
-- unique (UUIDs are random; first-8-char collisions are
-- astronomically unlikely at this scale).
UPDATE public.customers
SET    referral_code = upper(left(replace(id::text, '-', ''), 8))
WHERE  referral_code IS NULL;

-- ── 2. Enforce NOT NULL ───────────────────────────────────────
ALTER TABLE public.customers
  ALTER COLUMN referral_code SET NOT NULL;

-- ── 3. Unique constraint ─────────────────────────────────────
-- referral_code appears in shop URLs (/shop/:referralCode) and
-- is the primary lookup key for the reseller storefront.
ALTER TABLE public.customers
  ADD CONSTRAINT customers_referral_code_key
  UNIQUE (referral_code);

-- ── 4. Trigger: auto-generate on INSERT ──────────────────────
-- The frontend's createOrLoadCustomer does not pass a
-- referral_code. This trigger sets it before the row is written
-- so the SELECT that follows the INSERT always returns a code.
CREATE OR REPLACE FUNCTION public.set_customer_referral_code()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.referral_code IS NULL OR trim(NEW.referral_code) = '' THEN
    NEW.referral_code := upper(left(replace(NEW.id::text, '-', ''), 8));
  END IF;
  RETURN NEW;
END;
$$;

-- Drop first so re-running the migration is safe
DROP TRIGGER IF EXISTS trg_set_customer_referral_code ON public.customers;

CREATE TRIGGER trg_set_customer_referral_code
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_customer_referral_code();
