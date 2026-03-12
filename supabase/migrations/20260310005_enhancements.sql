-- MIGRATION 20260310005: Feature Tables (Version 1 - Production Ready)
-- Tables: stock_alerts, commission_approvals
-- Auth Model: Anon key blocked, service_role only (backend API only)
-- RLS Strategy: Deny all frontend access, allow only backend service_role calls
-- ====================================================================

-- Stock alerts table for low-stock notifications
-- ADMIN-ONLY FEATURE: Backend manages inventory alerts
-- Frontend: Cannot read or write directly
CREATE TABLE public.stock_alerts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  alert_type  text DEFAULT 'low_stock', -- 'low_stock', 'out_of_stock'
  threshold   integer DEFAULT 10,
  status      text DEFAULT 'active', -- 'active', 'resolved'
  created_at  timestamptz DEFAULT now(),
  resolved_at timestamptz
);

ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;

-- Block all anon/frontend access
-- Allow all service_role (backend) access
CREATE POLICY "Stock alerts - service_role only (backend)"
  ON public.stock_alerts FOR SELECT 
  USING (auth.role() = 'service_role');

CREATE POLICY "Stock alerts - insert service_role only"
  ON public.stock_alerts FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Stock alerts - update service_role only"
  ON public.stock_alerts FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Stock alerts - delete service_role only"
  ON public.stock_alerts FOR DELETE
  USING (auth.role() = 'service_role');

CREATE INDEX stock_alerts_product_id_idx ON public.stock_alerts(product_id);
CREATE INDEX stock_alerts_status_idx ON public.stock_alerts(status);

-- ====================================================================

-- Commission approvals table
-- ADMIN-ONLY FEATURE: Backend manages commission approval workflow
-- Frontend: Cannot read or write directly
CREATE TABLE public.commission_approvals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount            numeric NOT NULL,
  status            text DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'paid'
  mpesa_number      text,
  rejection_reason  text,
  approved_by       uuid REFERENCES public.staff_users(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  approved_at       timestamptz,
  paid_at           timestamptz
);

ALTER TABLE public.commission_approvals ENABLE ROW LEVEL SECURITY;

-- Block all anon/frontend access
-- Allow all service_role (backend) access
CREATE POLICY "Commission approvals - service_role only (backend)"
  ON public.commission_approvals FOR SELECT 
  USING (auth.role() = 'service_role');

CREATE POLICY "Commission approvals - insert service_role only"
  ON public.commission_approvals FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Commission approvals - update service_role only"
  ON public.commission_approvals FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Commission approvals - delete service_role only"
  ON public.commission_approvals FOR DELETE
  USING (auth.role() = 'service_role');

CREATE INDEX commission_approvals_customer_id_idx ON public.commission_approvals(customer_id);
CREATE INDEX commission_approvals_status_idx ON public.commission_approvals(status);

-- ====================================================================
-- PRODUCTION SECURITY MODEL:
--
-- Frontend (Anon Key):
-- ✓ Can insert orders (checkout)
-- ✓ Can read orders (customer dashboard)
-- ✗ Cannot update orders
-- ✗ Cannot access stock_alerts
-- ✗ Cannot access commission_approvals
-- ✗ Cannot access audit_log
--
-- Backend (Service Role Key):
-- ✓ Can do everything (called via backend API only)
--
-- MIGRATION VERIFICATION:
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE tablename IN ('stock_alerts', 'commission_approvals');
-- Expected: rowsecurity = true for both
-- ====================================================================
