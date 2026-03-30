-- MIGRATION 20260324002: Age Restriction Flag on Products
-- Adds is_age_restricted boolean column (default false).
-- Auto-sets true for all existing Wines & Spirits products.
-- Future products in that category should have it set on creation.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_age_restricted BOOLEAN NOT NULL DEFAULT false;

-- Back-fill any products already catalogued under Wines & Spirits
UPDATE public.products
  SET is_age_restricted = true
  WHERE category = 'Wines & Spirits';
