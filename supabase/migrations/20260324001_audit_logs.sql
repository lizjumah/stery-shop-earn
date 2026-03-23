-- MIGRATION 20260324001: Proper Audit Logs Table
-- ============================================================
-- The previous audit_log table (20260310004c) used:
--   staff_id uuid NOT NULL REFERENCES staff_users  ← wrong auth model
--   details jsonb                                   ← wrong column names
-- logAdminAction() was silently failing on every call.
-- This migration creates audit_logs (plural) with the correct schema.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id             uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type    text         NOT NULL,
  entity_id      text,
  action         text         NOT NULL,
  actor_user_id  text,
  actor_name     text,
  source         text         NOT NULL DEFAULT 'backend_api',
  reason         text,
  before_data    jsonb,
  after_data     jsonb,
  metadata       jsonb,
  created_at     timestamptz  NOT NULL DEFAULT now()
);

-- RLS: service_role only — all writes and reads go through the backend
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_read_service_role"
  ON public.audit_logs FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "audit_logs_insert_service_role"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Immutable — no updates or deletes ever
CREATE POLICY "audit_logs_no_update"
  ON public.audit_logs FOR UPDATE
  USING (false);

CREATE POLICY "audit_logs_no_delete"
  ON public.audit_logs FOR DELETE
  USING (false);

-- Indexes for the audit trail query patterns
CREATE INDEX idx_audit_logs_created_at  ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs (entity_type);
CREATE INDEX idx_audit_logs_entity_id   ON public.audit_logs (entity_id);
CREATE INDEX idx_audit_logs_action      ON public.audit_logs (action);
CREATE INDEX idx_audit_logs_actor       ON public.audit_logs (actor_user_id);
