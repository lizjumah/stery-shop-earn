-- Add barcode column to products.
-- TEXT (not numeric) to preserve leading zeros and support GS1/EAN formats.
-- NULL allowed so existing products keep working without any changes.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS barcode TEXT NULL;
