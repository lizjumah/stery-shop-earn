-- Add cost_price to products.
-- Nullable numeric — existing products default to NULL until set via product edit or future upload.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price NUMERIC NULL;
