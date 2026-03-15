-- 4-digit PIN for staff/owner login.
-- Null for regular customers (PIN not required).
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS staff_pin TEXT NULL;
