-- Add 'product_manager' to the allowed values for customers.role
-- Existing rows are unaffected; no data migration needed.

ALTER TABLE public.customers
  DROP CONSTRAINT IF EXISTS customers_role_check;

ALTER TABLE public.customers
  ADD CONSTRAINT customers_role_check
    CHECK (role IN ('customer', 'staff', 'owner', 'product_manager'));
