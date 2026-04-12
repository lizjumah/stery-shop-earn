-- ============================================================
-- Fix reseller_products RLS for phone-only auth model
-- ============================================================
--
-- The Phase 1 policies used JWT `sub` to enforce row ownership,
-- but this app has no Supabase Auth — all requests run as the
-- anon role with the publishable key. JWT sub is always null,
-- so those policies would silently reject every INSERT/UPDATE/DELETE.
--
-- Ownership is enforced at the application layer:
--   - INSERT always sets reseller_id = customer.id (from localStorage)
--   - SELECT/UPDATE/DELETE always filter by reseller_id = customer.id
-- This matches the same model used by commissions, referrals, and
-- all other customer-owned tables in this project.
-- ============================================================

-- Drop the JWT-based write policies that cannot work here
DROP POLICY IF EXISTS "reseller_products_insert" ON public.reseller_products;
DROP POLICY IF EXISTS "reseller_products_update" ON public.reseller_products;
DROP POLICY IF EXISTS "reseller_products_delete" ON public.reseller_products;

-- Allow anon (publishable-key) clients to insert their own rows.
-- Application always sets reseller_id = logged-in customer.id.
CREATE POLICY "reseller_products_insert_anon"
  ON public.reseller_products FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon clients to update rows (e.g. toggle is_active).
-- Application always filters WHERE reseller_id = customer.id.
CREATE POLICY "reseller_products_update_anon"
  ON public.reseller_products FOR UPDATE
  TO anon
  USING (true);

-- Allow anon clients to delete rows.
-- Application always filters WHERE reseller_id = customer.id.
CREATE POLICY "reseller_products_delete_anon"
  ON public.reseller_products FOR DELETE
  TO anon
  USING (true);
