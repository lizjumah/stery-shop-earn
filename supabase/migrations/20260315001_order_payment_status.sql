-- Add payment_status to orders
-- Allowed values: pending | paid | delivery_fee_paid
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid', 'delivery_fee_paid'));

-- Backfill: any order that already has paid_at set should be treated as paid
UPDATE public.orders
  SET payment_status = 'paid'
  WHERE paid_at IS NOT NULL AND payment_status = 'pending';
