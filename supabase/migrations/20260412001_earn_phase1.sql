-- ============================================================
-- PHASE 1: Earn with Stery — database foundation
-- ============================================================

-- ── 1. Products: earn eligibility ────────────────────────────
-- Replaces the hardcoded `commission >= 40` filter in the UI.
-- Admin can now explicitly mark which products are available
-- for resellers to share and earn on.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_earnable boolean NOT NULL DEFAULT false;

-- Pre-populate: any product that already has a commission value
-- set is implicitly earnable — mark them true so nothing breaks.
UPDATE public.products
  SET is_earnable = true
  WHERE commission IS NOT NULL AND commission > 0;

-- ── 2. Orders: referral tracking ─────────────────────────────
-- referrer_id: the customer (reseller) whose link drove this order.
-- referral_code: the actual code string captured from ?ref= param
--   at time of order — stored as text so it survives if the
--   customer record is later deleted (referrer_id would go null
--   on delete, but we still have the code string for auditing).
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS referrer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_code text;

CREATE INDEX IF NOT EXISTS idx_orders_referrer_id
  ON public.orders(referrer_id)
  WHERE referrer_id IS NOT NULL;

-- ── 3. Customers: reseller profile fields ────────────────────
-- is_reseller: explicit opt-in flag, separate from `role`.
--   Allows a customer-role user to also be a reseller without
--   needing a role change. Controlled by admin or onboarding flow.
-- storefront_name: display name for the reseller's personal store
--   (e.g. "Amina's Stery Shop").
-- storefront_bio: short description shown on their share pages.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS is_reseller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS storefront_name text,
  ADD COLUMN IF NOT EXISTS storefront_bio text;

CREATE INDEX IF NOT EXISTS idx_customers_is_reseller
  ON public.customers(is_reseller)
  WHERE is_reseller = true;

-- ── 4. New table: reseller_products ──────────────────────────
-- Stores each reseller's personally curated product list.
-- A reseller can pick which earnable products they want to
-- actively promote. is_active lets them pause a product without
-- removing it from their list.
CREATE TABLE IF NOT EXISTS public.reseller_products (
  id           uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id  uuid        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  product_id   uuid        NOT NULL REFERENCES public.products(id)  ON DELETE CASCADE,
  is_active    boolean     NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reseller_products_unique UNIQUE (reseller_id, product_id)
);

-- Lookup by reseller (most common query: "show me this reseller's products")
CREATE INDEX IF NOT EXISTS idx_reseller_products_reseller_id
  ON public.reseller_products(reseller_id);

-- Lookup by product (less common: "which resellers are promoting this product")
CREATE INDEX IF NOT EXISTS idx_reseller_products_product_id
  ON public.reseller_products(product_id);

-- ── 5. RLS for reseller_products ─────────────────────────────
ALTER TABLE public.reseller_products ENABLE ROW LEVEL SECURITY;

-- Anyone can read reseller product lists (needed for share pages)
CREATE POLICY "reseller_products_select"
  ON public.reseller_products FOR SELECT
  USING (true);

-- Resellers can manage their own product list
CREATE POLICY "reseller_products_insert"
  ON public.reseller_products FOR INSERT
  WITH CHECK (reseller_id::text = (current_setting('request.jwt.claims', true)::jsonb->>'sub'));

CREATE POLICY "reseller_products_update"
  ON public.reseller_products FOR UPDATE
  USING (reseller_id::text = (current_setting('request.jwt.claims', true)::jsonb->>'sub'));

CREATE POLICY "reseller_products_delete"
  ON public.reseller_products FOR DELETE
  USING (reseller_id::text = (current_setting('request.jwt.claims', true)::jsonb->>'sub'));
