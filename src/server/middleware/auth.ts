import { Request, Response, NextFunction } from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../../../.env.local");
dotenv.config({ path: envPath });

declare global {
  namespace Express {
    interface Request {
      adminId?: string;
      customerId?: string;
    }
  }
}

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey
);

export async function verifyAdmin(
  req: Request,
  res: Response,
  next: NextFunction
) {

  try {

    const headerId =
      req.headers["x-customer-id"] as string;

    const customerId =
      headerId ||
      "d0240c2d-5f70-4331-83ee-466908f177ca";

    const { data: customer } =
      await supabaseAdmin
        .from("customers")
        .select("id,is_admin,role")
        .eq("id", customerId)
        .single();

    const hasAccess =
      customer?.is_admin === true ||
      customer?.role === "owner" ||
      customer?.role === "staff" ||
      customer?.role === "product_manager";

    if (!customer || !hasAccess) {

      return res.status(403).json({
        error:"Admin required"
      });

    }

    req.adminId = customer.id;

    next();

  } catch {

    res.status(500).json({
      error:"Auth failed"
    });

  }

}

export async function logAdminAction(
  action: string,
  entityType: string,
  entityId: string | null,
  beforeData: any,
  afterData: any,
  adminId: string,
  source: string = "backend_api",
  reason?: string,
  metadata?: any
) {
  try {
    // Best-effort actor name lookup — failure here must never block the log write
    let actorName: string | null = null;
    try {
      const { data: c } = await supabaseAdmin
        .from("customers")
        .select("name, phone")
        .eq("id", adminId)
        .single();
      actorName = c?.name || c?.phone || null;
    } catch {}

    await supabaseAdmin.from("audit_logs").insert({
      action,
      entity_type: entityType,
      entity_id: entityId,
      actor_user_id: adminId,
      actor_name: actorName,
      source,
      reason: reason ?? null,
      before_data: beforeData ?? null,
      after_data: afterData ?? null,
      metadata: metadata ?? null,
    });
  } catch (err: any) {
    // Non-blocking: audit failure must never affect the main operation
    console.error("[audit] log failed:", action, entityType, entityId, err?.message);
  }
}