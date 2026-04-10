-- Add is_featured flag to products for manual merchandising control.
-- Used as the fallback pool for the Popular Products homepage section
-- when there is insufficient recent sales data.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
