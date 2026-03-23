-- ── Inventory Uploads ────────────────────────────────────────────────────────
-- One row per uploaded POS stock file.
-- Stores summary counts and metadata. Status: 'analyzed' | 'applied'.
CREATE TABLE IF NOT EXISTS public.inventory_uploads (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name          TEXT         NOT NULL,
  stock_date         DATE         NOT NULL,
  notes              TEXT,
  uploaded_by        UUID         REFERENCES public.customers(id),
  status             TEXT         NOT NULL DEFAULT 'analyzed',
  -- summary counts (computed during analysis, never changed)
  total_rows         INT          NOT NULL DEFAULT 0,
  matched_rows       INT          NOT NULL DEFAULT 0,
  changed_rows       INT          NOT NULL DEFAULT 0,
  unchanged_rows     INT          NOT NULL DEFAULT 0,
  unmatched_rows     INT          NOT NULL DEFAULT 0,
  invalid_rows       INT          NOT NULL DEFAULT 0,
  duplicate_barcodes INT          NOT NULL DEFAULT 0,
  applied_at         TIMESTAMPTZ,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Inventory Upload Items ────────────────────────────────────────────────────
-- One row per CSV row that needs attention: changed, unmatched, or invalid.
-- Unchanged rows are counted in inventory_uploads but NOT stored here to keep
-- storage lean when files have 10,000 rows.
CREATE TABLE IF NOT EXISTS public.inventory_upload_items (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id      UUID         NOT NULL REFERENCES public.inventory_uploads(id) ON DELETE CASCADE,
  barcode        TEXT         NOT NULL,
  product_id     UUID         REFERENCES public.products(id),
  product_name   TEXT,
  stock_in_file  INT          NOT NULL,
  stock_in_db    INT,
  -- 'changed' | 'unmatched' | 'invalid'
  status         TEXT         NOT NULL,
  row_number     INT,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Fast lookups for preview pagination
CREATE INDEX IF NOT EXISTS idx_inv_items_upload_id
  ON public.inventory_upload_items(upload_id);

CREATE INDEX IF NOT EXISTS idx_inv_items_upload_status
  ON public.inventory_upload_items(upload_id, status);

-- ── RLS ───────────────────────────────────────────────────────────────────────
-- Match existing project convention: open policies, access controlled by
-- the Express backend's verifyAdmin middleware.
ALTER TABLE public.inventory_uploads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_upload_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access" ON public.inventory_uploads
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public access" ON public.inventory_upload_items
  FOR ALL USING (true) WITH CHECK (true);
