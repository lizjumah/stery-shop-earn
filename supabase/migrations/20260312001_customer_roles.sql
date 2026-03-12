-- Migration: Add role column to customers table
-- Roles: customer (shop only), staff (admin only), owner (both shop + admin)

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'customer';

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_role_check;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_role_check
  CHECK (role IN ('customer', 'staff', 'owner'));

-- Promote existing admins (is_admin = true) to 'owner'
UPDATE public.customers
  SET role = 'owner'
  WHERE is_admin = true AND role = 'customer';
