-- Owner security PIN — separate from staff_pin.
-- Stored as a bcrypt hash. Null until the owner sets one.
-- Used only to gate sensitive admin actions; not required for login.
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS owner_pin text NULL;
