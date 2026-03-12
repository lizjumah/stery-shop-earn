-- MIGRATION 20260310004c: Audit Log Table
-- Purpose: Track all staff actions for compliance and performance metrics
-- Dependencies: staff_users table must exist (created in migration 20260310001)
-- ====================================================================

-- Step 1: Create audit_log table
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff_users(id) ON DELETE RESTRICT,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

-- Step 2: Enable Row Level Security
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies (PRODUCTION-SAFE)
-- Security: Backend-only access via service_role
-- Anon key: Completely denied (403 Forbidden)
-- 
-- This table tracks which admin made what changes and when.
-- Example: "Admin updated order #123 from pending to confirmed"
-- 
-- All audit log operations happen via backend API, not directly from frontend

-- SELECT: Service role only (backend reads logs for dashboards/reports)
-- Anon key: DENIED
CREATE POLICY "Admin logs read by backend only"
  ON public.audit_log FOR SELECT 
  USING (auth.role() = 'service_role');

-- INSERT: Service role only (backend auto-logs admin actions)
-- Anon key: DENIED
-- Triggers or backend logic will insert entries when admins take action
CREATE POLICY "Admin logs written by backend only"
  ON public.audit_log FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- NO UPDATE or DELETE - audit logs are immutable
-- If needed, add policies to block explicitly:
CREATE POLICY "Audit logs are immutable - no updates"
  ON public.audit_log FOR UPDATE
  USING (false);

CREATE POLICY "Audit logs are immutable - no deletes"
  ON public.audit_log FOR DELETE
  USING (false);

-- Step 4: Create indexes for common queries
CREATE INDEX idx_audit_log_staff_id ON public.audit_log(staff_id);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_entity_type ON public.audit_log(entity_type);

-- Step 5: Create composite indexes for performance metrics queries
CREATE INDEX idx_audit_log_staff_action ON public.audit_log(staff_id, action);
CREATE INDEX idx_audit_log_entity_lookup ON public.audit_log(entity_type, entity_id);

-- ====================================================================
-- Usage Examples:
-- 
-- Logger for product creation:
-- INSERT INTO public.audit_log (staff_id, action, entity_type, entity_id, details)
-- VALUES (auth.uid(), 'create', 'products', product_id, 
--   jsonb_build_object('name', product_name, 'price', product_price));
--
-- Logger for order status update:
-- INSERT INTO public.audit_log (staff_id, action, entity_type, entity_id, details)
-- VALUES (auth.uid(), 'update_status', 'orders', order_id, 
--   jsonb_build_object('old_status', 'received', 'new_status', 'preparing'));
--
-- Logger for commission approval:
-- INSERT INTO public.audit_log (staff_id, action, entity_type, entity_id, details)
-- VALUES (auth.uid(), 'approve', 'commission_approvals', approval_id, 
--   jsonb_build_object('customer_id', customer_id, 'amount', amount));
--
-- Query performance metrics for a staff member:
-- SELECT COUNT(*) as action_count, action
-- FROM public.audit_log
-- WHERE staff_id = 'staff-uuid' AND created_at > now() - INTERVAL '1 day'
-- GROUP BY action
-- ORDER BY action_count DESC;
--
-- Query all actions on a specific entity:
-- SELECT * FROM public.audit_log
-- WHERE entity_type = 'orders' AND entity_id = 'order-uuid'
-- ORDER BY created_at DESC;
-- ====================================================================
