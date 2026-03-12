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
        .select("id,is_admin")
        .eq("id", customerId)
        .single();

    if (!customer || !customer.is_admin) {

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

/* ADD THIS FUNCTION BACK */
export async function logAdminAction(
  action:string,
  entityType:string,
  entityId:string,
  oldValues:any,
  newValues:any,
  adminId:string
){

  try{

    await supabaseAdmin
      .from("audit_log")
      .insert({

        action,

        entity_type:entityType,

        entity_id:entityId,

        old_values:oldValues,

        new_values:newValues,

        performed_by_admin_id:adminId,

        created_at:new Date().toISOString()

      });

  }catch{

    console.log("audit log skipped");

  }

}