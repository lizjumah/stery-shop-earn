ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stock_status TEXT NOT NULL DEFAULT 'in_stock'
    CHECK (stock_status IN ('in_stock', 'low_stock', 'out_of_stock'));
