-- pos_upload_logs: one record per POS stock file upload session
CREATE TABLE IF NOT EXISTS public.pos_upload_logs (
  id             uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name      text         NOT NULL,
  uploaded_by    text,
  total_rows     integer      DEFAULT 0,
  matched_rows   integer      DEFAULT 0,
  unmatched_rows integer      DEFAULT 0,
  invalid_rows   integer      DEFAULT 0,
  updated_rows   integer      DEFAULT 0,
  failed_rows    integer      DEFAULT 0,
  status         text         DEFAULT 'previewed',
  applied_at     timestamptz,
  created_at     timestamptz  DEFAULT now()
);

-- pos_upload_items: one record per extracted product row from the POS file
CREATE TABLE IF NOT EXISTS public.pos_upload_items (
  id              uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id       uuid         REFERENCES public.pos_upload_logs(id) ON DELETE CASCADE,
  barcode         text,
  pos_description text,
  pos_stock       numeric,
  pos_price       numeric,
  pos_category    text,
  product_id      uuid,
  product_name    text,
  current_stock   integer,
  status          text,        -- 'matched' | 'unmatched' | 'invalid'
  invalid_reason  text,
  row_number      integer
);

CREATE INDEX IF NOT EXISTS idx_pos_upload_items_upload_id
  ON public.pos_upload_items(upload_id);
