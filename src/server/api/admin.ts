import { Router, Request, Response } from "express";
import { verifyAdmin, logAdminAction, supabaseAdmin } from "../middleware/auth";

const router = Router();

router.use(verifyAdmin);

/*
POST /api/admin/images/upload
Receives a file processed by multer (memory storage) and uploads it to Supabase Storage.
Returns the public URL of the uploaded image.
*/
router.post("/images/upload", async (req: Request, res: Response) => {
  try {
    const file = (req as any).file;
    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const ext = file.originalname.split(".").pop() || "jpg";
    const filename = `products/${timestamp}-${random}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from("product-images")
      .upload(filename, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      return res.status(500).json({ error: "Upload failed", message: error.message });
    }

    const { data: urlData } = supabaseAdmin.storage
      .from("product-images")
      .getPublicUrl(data.path);

    return res.json({ success: true, url: urlData.publicUrl });
  } catch (err: any) {
    return res.status(500).json({ error: "Upload failed", message: err.message });
  }
});

/*
GET STOCK ALERTS
*/
router.get("/stock-alerts", async (req: Request, res: Response) => {

  try {

    const { data, error } =
      await supabaseAdmin
        .from("stock_alerts")
        .select(`
          *,
          products:product_id(
            id,
            name
          )
        `)
        .order("created_at", { ascending:false });

    if(error){
      throw error;
    }

    res.json({

      success:true,

      alerts:data || [],

      count:data?.length || 0

    });

  } catch(err:any){

    console.log("Stock alerts error:",err);

    res.status(500).json({

      error:"Failed to fetch stock alerts",

      message:err.message

    });

  }

});

/*
CREATE STOCK ALERT
*/
router.post("/stock-alerts", async (req:Request,res:Response)=>{

  try{

    const { product_id, threshold_quantity } = req.body;

    const { data,error } =
      await supabaseAdmin
        .from("stock_alerts")
        .insert({

          product_id,

          threshold_quantity,

          status:"active",

          created_at:new Date().toISOString()

        })
        .select()
        .single();

    if(error){
      throw error;
    }

    await logAdminAction(

      "CREATE_STOCK_ALERT",

      "stock_alert",

      data.id,

      null,

      data,

      req.adminId!

    );

    res.json({

      success:true,

      alert:data

    });

  }catch(err:any){

    res.status(500).json({

      error:"Failed to create alert",

      message:err.message

    });

  }

});

/*
RESOLVE STOCK ALERT
*/
router.put("/stock-alerts/:id", async (req:Request,res:Response)=>{

  try{

    const id = req.params.id;

    const { data,error } =
      await supabaseAdmin
        .from("stock_alerts")
        .update({

          status:"resolved",

          resolved_at:new Date().toISOString()

        })
        .eq("id",id)
        .select()
        .single();

    if(error){
      throw error;
    }

    await logAdminAction(

      "RESOLVE_STOCK_ALERT",

      "stock_alert",

      id,

      null,

      data,

      req.adminId!

    );

    res.json({

      success:true,

      alert:data

    });

  }catch(err:any){

    res.status(500).json({

      error:"Failed to resolve alert",

      message:err.message

    });

  }

});

/*
POST /api/admin/orders/:id/payment-status
Updates the payment_status (and paid_at) of an order. Accessible by owner, admin, and staff.
*/
router.post("/orders/:id/payment-status", async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const { payment_status } = req.body;

    if (!payment_status) {
      return res.status(400).json({ error: "payment_status is required" });
    }

    const updates: Record<string, unknown> = { payment_status };
    if (payment_status === "paid") {
      updates.paid_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await logAdminAction(
      "UPDATE_PAYMENT_STATUS",
      "order",
      id,
      null,
      { payment_status },
      req.adminId!
    );

    res.json({ success: true, order: data });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update payment status", message: err.message });
  }
});

/*
POST /api/admin/orders/:id/status
Updates the status of an order. Accessible by owner, admin, and staff.
*/
router.post("/orders/:id/status", async (req: Request, res: Response) => {

  try {

    const id = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const { data: oldOrder } = await supabaseAdmin
      .from("orders")
      .select("status")
      .eq("id", id)
      .single();

    const { data, error } = await supabaseAdmin
      .from("orders")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    await logAdminAction(
      "UPDATE_ORDER_STATUS",
      "order",
      id,
      { status: oldOrder?.status },
      { status },
      req.adminId!
    );

    res.json({ success: true, order: data });

  } catch (err: any) {

    res.status(500).json({
      error: "Failed to update order status",
      message: err.message
    });

  }

});

/*
POST /api/admin/products/validate-barcode
Checks whether a barcode is already assigned to another product.
Body: { barcode: string, excludeId?: string, isCreate?: boolean }
Returns: { required: true } | { duplicate: true, name: string } | { ok: true }
*/
router.post("/products/validate-barcode", async (req: Request, res: Response) => {
  try {
    const { barcode, excludeId, isCreate } = req.body;

    // Enforce required on create
    if (isCreate && (!barcode || !String(barcode).trim())) {
      return res.json({ required: true, duplicate: false });
    }

    if (!barcode || !String(barcode).trim()) {
      return res.json({ duplicate: false });
    }

    let query = supabaseAdmin
      .from("products")
      .select("id, name")
      .eq("barcode", String(barcode).trim());

    if (excludeId) {
      query = query.neq("id", excludeId);
    }

    const { data, error } = await query.maybeSingle();

    if (error) throw error;

    if (data) {
      return res.json({ duplicate: true, name: data.name });
    }

    return res.json({ duplicate: false });
  } catch (err: any) {
    res.status(500).json({ error: "Barcode check failed", message: err.message });
  }
});

/*
POST /api/admin/products/import
Bulk-inserts products from a pre-validated CSV payload.
Body: { rows: Array<{ name, barcode?, price, cost_price?, stock? }> }
- Fetches all existing barcodes first to skip duplicates server-side.
- Inserts in batches of 50.
- Returns { imported, skippedDuplicates, skippedErrors, errors[] }
*/
router.post("/products/import", async (req: Request, res: Response) => {
  try {
    const { rows } = req.body as {
      rows: Array<{
        name: string;
        barcode?: string;
        price: number;
        cost_price?: number;
        stock?: number;
        category?: string;
        subcategory?: string;
      }>;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "No rows provided" });
    }

    // Fetch all existing barcodes once to avoid per-row round trips
    const { data: existingProducts, error: fetchError } = await supabaseAdmin
      .from("products")
      .select("barcode")
      .not("barcode", "is", null);

    if (fetchError) throw fetchError;

    const existingBarcodes = new Set(
      (existingProducts || []).map((p: any) => String(p.barcode).trim())
    );

    const toInsert: any[] = [];
    let skippedDuplicates = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const barcode = row.barcode ? String(row.barcode).trim() : null;

      // Server-side duplicate guard
      if (barcode && existingBarcodes.has(barcode)) {
        skippedDuplicates++;
        continue;
      }

      const stockQty = row.stock != null ? Number(row.stock) : 0;
      toInsert.push({
        name: String(row.name).trim(),
        price: Number(row.price),
        stock_quantity: stockQty,
        barcode: barcode || null,
        category: row.category || null,
        subcategory: row.subcategory || null,
        commission: 0,
        loyalty_points: 0,
        is_offer: false,
        stock_status:
          stockQty === 0 ? "out_of_stock" : stockQty <= 10 ? "low_stock" : "in_stock",
        in_stock: stockQty > 0,
      });

      // Track barcodes added in this batch so intra-batch duplicates are caught
      if (barcode) existingBarcodes.add(barcode);
    }

    // Insert in batches of 50
    const BATCH = 50;
    let imported = 0;
    let skippedErrors = 0;

    for (let i = 0; i < toInsert.length; i += BATCH) {
      const batch = toInsert.slice(i, i + BATCH);
      const { error: insertError } = await supabaseAdmin
        .from("products")
        .insert(batch);

      if (insertError) {
        // If a whole batch fails, count each row as an error and record it
        skippedErrors += batch.length;
        errors.push(`Batch ${Math.floor(i / BATCH) + 1}: ${insertError.message}`);
      } else {
        imported += batch.length;
      }
    }

    await logAdminAction(
      "CSV_IMPORT",
      "products",
      null,
      null,
      { imported, skippedDuplicates, skippedErrors },
      req.adminId!
    );

    res.json({ success: true, imported, skippedDuplicates, skippedErrors, errors });
  } catch (err: any) {
    res.status(500).json({ error: "Import failed", message: err.message });
  }
});

/*
POST /api/admin/audit
Accepts a frontend-initiated audit event (e.g. product created/updated via UI).
Body: { action, entity_type, entity_id?, source?, reason?, before_data?, after_data?, metadata? }
Non-blocking: always returns 200 so main UI action is never blocked.
*/
router.post("/audit", async (req: Request, res: Response) => {
  const { action, entity_type, entity_id, source, reason, before_data, after_data, metadata } = req.body;

  if (!action || !entity_type) {
    return res.status(400).json({ error: "action and entity_type are required" });
  }

  // Fire-and-forget: do not await — return immediately so UI is never blocked
  logAdminAction(
    action,
    entity_type,
    entity_id ?? null,
    before_data ?? null,
    after_data ?? null,
    req.adminId!,
    source ?? "admin_ui",
    reason ?? undefined,
    metadata ?? undefined
  ).catch(() => {}); // logAdminAction already handles errors internally

  return res.json({ success: true });
});

/*
GET /api/admin/audit
Paginated, filtered read of the audit_logs table.
Query params:
  page          — 1-based page number (default 1, page size 50)
  entity_type   — exact filter
  action        — exact filter
  actor_user_id — exact filter
  from_date     — inclusive lower bound (YYYY-MM-DD)
  to_date       — inclusive upper bound (YYYY-MM-DD, extended to end of day)
  search        — partial match on entity_id or actor_name
*/
router.get("/audit", async (req: Request, res: Response) => {
  try {
    const { entity_type, action, actor_user_id, from_date, to_date, search } =
      req.query as Record<string, string>;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const PAGE_SIZE = 50;
    const offset = (page - 1) * PAGE_SIZE;

    let query = supabaseAdmin
      .from("audit_logs")
      .select("*", { count: "exact" });

    if (entity_type) query = query.eq("entity_type", entity_type);
    if (action) query = query.eq("action", action);
    if (actor_user_id) query = query.eq("actor_user_id", actor_user_id);
    if (from_date) query = query.gte("created_at", from_date + "T00:00:00Z");
    if (to_date) query = query.lte("created_at", to_date + "T23:59:59Z");
    if (search?.trim()) {
      query = query.or(
        `entity_id.ilike.%${search.trim()}%,actor_name.ilike.%${search.trim()}%`
      );
    }

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    return res.json({
      success: true,
      logs: data || [],
      total: count ?? 0,
      page,
      page_size: PAGE_SIZE,
    });
  } catch (err: any) {
    console.error("Audit logs fetch error:", err);
    return res
      .status(500)
      .json({ error: "Failed to fetch audit logs", message: err.message });
  }
});

export default router;