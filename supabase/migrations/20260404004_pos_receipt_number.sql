-- POS receipt number entered by staff when marking an order as processed_at_pos.
-- Used for reconciliation between app orders and POS sales.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pos_receipt_number text NULL;
