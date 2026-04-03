-- MIGRATION 20260401001: Activity Logs Table
-- ============================================================
-- Flat field-level change log. Simpler and more queryable than
-- audit_logs (which stores JSONB blobs). Designed for per-field
-- diffs (e.g. order_status changed from X to Y).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   text        NOT NULL,
  entity_id     text        NOT NULL,
  action        text        NOT NULL,
  field_changed text,
  old_value     text,
  new_value     text,
  changed_by    text,
  source        text,
  changed_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes for the most common query patterns
CREATE INDEX idx_activity_logs_entity ON public.activity_logs (entity_type, entity_id);
CREATE INDEX idx_activity_logs_changed_at ON public.activity_logs (changed_at DESC);

-- RLS: service_role only — all writes go through the backend
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_logs_read_service_role"
  ON public.activity_logs FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "activity_logs_insert_service_role"
  ON public.activity_logs FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Immutable — no updates or deletes
CREATE POLICY "activity_logs_no_update"
  ON public.activity_logs FOR UPDATE
  USING (false);

CREATE POLICY "activity_logs_no_delete"
  ON public.activity_logs FOR DELETE
  USING (false);
