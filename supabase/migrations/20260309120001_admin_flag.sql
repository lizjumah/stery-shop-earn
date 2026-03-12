-- Add is_admin flag to customers so the admin dashboard can be gated
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS is_admin boolean DEFAULT false;

-- To make a customer an admin, run in the Supabase SQL editor:
-- UPDATE public.customers SET is_admin = true WHERE phone = '+254XXXXXXXXXX';
