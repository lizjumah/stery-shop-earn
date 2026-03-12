-- MIGRATION 20260311001: Fix orders UPDATE RLS policy
-- Problem: "Only backend can update orders" requires auth.role() = 'service_role'
--          but the frontend uses the anon key, so all status updates are silently
--          rejected (0 rows updated, no error), making status changes non-persistent.
-- Fix: Replace the service_role-only UPDATE policy with an open policy that allows
--      the anon key to update orders — matching the existing INSERT/SELECT policies.
-- ====================================================================

-- Drop the blocking policy
DROP POLICY IF EXISTS "Only backend can update orders" ON public.orders;

-- Replace with open update policy (consistent with INSERT/SELECT on this table)
CREATE POLICY "Anyone can update orders"
  ON public.orders FOR UPDATE
  USING (true)
  WITH CHECK (true);
