import { supabaseAdmin } from "../middleware/auth";

interface ActivityLogEntry {
  entity_type: string;
  entity_id: string;
  action: string;
  field_changed?: string;
  old_value?: string;
  new_value?: string;
  changed_by?: string;
  source?: string;
}

/**
 * Inserts a single row into activity_logs.
 * Non-blocking: logs errors to console but never throws.
 */
export async function logActivity(entry: ActivityLogEntry): Promise<void> {
  try {
    const { error } = await supabaseAdmin.from("activity_logs").insert({
      entity_type:   entry.entity_type,
      entity_id:     entry.entity_id,
      action:        entry.action,
      field_changed: entry.field_changed ?? null,
      old_value:     entry.old_value ?? null,
      new_value:     entry.new_value ?? null,
      changed_by:    entry.changed_by ?? "unknown",
      source:        entry.source ?? null,
    });

    if (error) {
      console.error("[activity_log] insert failed:", entry.action, entry.entity_id, error.message);
    }
  } catch (err: any) {
    console.error("[activity_log] unexpected error:", entry.action, entry.entity_id, err?.message ?? err);
  }
}
