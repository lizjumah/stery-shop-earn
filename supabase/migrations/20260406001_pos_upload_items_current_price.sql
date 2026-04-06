-- Add current_price to pos_upload_items so apply can compare and log price changes
ALTER TABLE public.pos_upload_items
  ADD COLUMN IF NOT EXISTS current_price numeric NULL;
