import { Router, Request, Response } from "express";
import multer from "multer";
import { verifyAdmin, logAdminAction, supabaseAdmin } from "../middleware/auth";
import {
  sendOrderAlert,
  sendCustomerConfirmation,
  sendCustomerReadyNotification,
  sendCustomerDispatchedNotification,
} from "../lib/whatsapp";
import { logActivity } from "../lib/logActivity";

// Multer instance for bulk image uploads — memory storage, images only, max 200 files / 5 MB each
const bulkImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 200 },
});

const router = Router();

// Idempotency guard: tracks order IDs that have already been alerted this session.
// Prevents duplicate WhatsApp alerts when deduct-stock is called more than once
// for the same order (e.g. button double-click, network retry).
const alertedOrders = new Set<string>();

/*
POST /api/admin/orders/:id/deduct-stock
Called fire-and-forget by the frontend immediately after a successful order insert.
Does NOT require admin access — placed before verifyAdmin middleware.

Responsibilities:
  1. Deduct stock_quantity for each ordered product (floor at 0).
  2. Fetch the saved order and send a WhatsApp alert to configured recipients,
     but only once per order ID (idempotency guard via alertedOrders Set).

The response is sent first (200) so the caller is never blocked.
*/
router.post("/orders/:id/deduct-stock", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { items } = req.body as {
    items: Array<{ productId: string; quantity: number }>;
  };

  // Respond immediately — do not block the customer
  res.json({ success: true });

  console.log(`[deduct-stock] Route reached for order ${id}`);

  try {
    // 1. Deduct stock for each item
    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const { data: product } = await supabaseAdmin
          .from("products")
          .select("stock_quantity")
          .eq("id", item.productId)
          .single();

        if (product && product.stock_quantity !== null) {
          const newQty = Math.max(0, product.stock_quantity - item.quantity);
          const stockStatus =
            newQty === 0 ? "out_of_stock" : newQty <= 5 ? "low_stock" : "in_stock";
          await supabaseAdmin
            .from("products")
            .update({ stock_quantity: newQty, stock_status: stockStatus, in_stock: newQty > 0 })
            .eq("id", item.productId);
        }
      }
    }

    // 2. Idempotency check — skip alert if this order was already processed
    if (alertedOrders.has(id)) {
      return;
    }

    // 3. Fetch the full order and fire the WhatsApp alert
    const { data: order, error: orderFetchError } = await supabaseAdmin
      .from("orders")
      .select("id, order_number, customer_name, customer_phone, total, payment_status, delivery_option, delivery_area, delivery_location, items, created_at")
      .eq("id", id)
      .single();

    if (orderFetchError) {
      console.error("[deduct-stock] Supabase fetch failed for order", id, "—", orderFetchError.message);
    }

    if (order) {
      alertedOrders.add(id);
      const alertPayload = {
        id:                order.id,
        order_number:      order.order_number,
        customer_name:     order.customer_name,
        customer_phone:    order.customer_phone,
        total:             order.total,
        payment_status:    order.payment_status,
        delivery_option:   order.delivery_option ?? "pickup",
        delivery_area:     order.delivery_area,
        delivery_location: order.delivery_location,
        items:             Array.isArray(order.items) ? order.items : [],
        created_at:        order.created_at,
      };
      sendOrderAlert(alertPayload).catch(console.error);
      sendCustomerConfirmation(alertPayload).catch(console.error);
    }
  } catch (err: any) {
    console.error("[deduct-stock] Background error for order", id, ":", err?.message ?? err);
  }
});

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

    const { data: oldOrder } = await supabaseAdmin
      .from("orders")
      .select("payment_status")
      .eq("id", id)
      .single();

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

    // Flat field-level activity log — only if value actually changed (non-blocking)
    if (oldOrder?.payment_status !== payment_status) {
      logActivity({
        entity_type:   "order",
        entity_id:     id,
        action:        "status_changed",
        field_changed: "payment_status",
        old_value:     oldOrder?.payment_status ?? "unknown",
        new_value:     payment_status,
        changed_by:    req.adminId ?? "unknown",
        source:        "admin_dashboard",
      }).catch(console.error);
    }

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

    // Only log when status actually changed — avoids noise from no-op saves
    if (oldOrder?.status !== status) {
      await logAdminAction(
        "UPDATE_ORDER_STATUS",
        "order",
        id,
        { status: oldOrder?.status },
        { status },
        req.adminId!
      );

      // Flat field-level activity log (non-blocking)
      logActivity({
        entity_type:   "order",
        entity_id:     id,
        action:        "status_changed",
        field_changed: "order_status",
        old_value:     oldOrder?.status ?? "unknown",
        new_value:     status,
        changed_by:    req.adminId ?? "unknown",
        source:        "admin_dashboard",
      }).catch(console.error);
    }

    res.json({ success: true, order: data });

    // Fire-and-forget customer WhatsApp notification on genuine status transitions
    if (data && oldOrder?.status !== status) {
      const notifPayload = {
        id:                data.id,
        order_number:      data.order_number,
        customer_name:     data.customer_name,
        customer_phone:    data.customer_phone,
        total:             Number(data.total),
        delivery_option:   data.delivery_option ?? "pickup",
        delivery_area:     data.delivery_area,
        delivery_location: data.delivery_location,
        items:             Array.isArray(data.items) ? data.items : [],
        created_at:        data.created_at,
      };

      if (status === "ready_for_pickup") {
        sendCustomerReadyNotification(notifPayload).catch(console.error);
      } else if (status === "out_for_delivery") {
        sendCustomerDispatchedNotification(notifPayload).catch(console.error);
      }
    }

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
POST /api/admin/products/bulk-images
Uploads multiple image files and matches each to a product by barcode.
Matching: filename without extension = product barcode (TEXT).
Only updates image_url — nothing else is changed.
Permission: owner or is_admin only (staff cannot use this).
Accepts: .jpg .jpeg .png .webp — up to 200 files, 5 MB each.
Returns: { matched, unmatched, failed, unmatched_filenames[] }
*/
router.post("/products/bulk-images", async (req: Request, res: Response) => {
  // Apply multer and surface any file-level errors gracefully
  const multerError = await new Promise<string | null>((resolve) => {
    bulkImageUpload.array("images", 200)(req as any, res as any, (err: any) => {
      resolve(err ? (err.message ?? String(err)) : null);
    });
  });
  if (multerError) {
    return res.status(400).json({ error: "File upload error", message: multerError });
  }

  try {
    // Extra permission check: owner/admin only (staff are blocked even though verifyAdmin passes)
    const { data: actor } = await supabaseAdmin
      .from("customers")
      .select("is_admin, role")
      .eq("id", req.adminId!)
      .single();

    const canUpload =
      actor?.is_admin === true ||
      actor?.role === "owner" ||
      actor?.role === "product_manager";
    if (!canUpload) {
      return res.status(403).json({ error: "Owner or product manager access required for bulk image upload" });
    }

    const files = (req as any).files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No image files provided" });
    }

    // 1. Extract all barcodes from filenames in one pass
    const barcodes = files.map((f) =>
      f.originalname.replace(/\.[^.]+$/, "").trim()
    );

    // 2. Batch-fetch all matching products in a single query
    const { data: matchedProducts, error: fetchError } = await supabaseAdmin
      .from("products")
      .select("id, barcode, name")
      .in("barcode", barcodes);

    if (fetchError) throw fetchError;

    const productMap = new Map<string, { id: string; name: string }>();
    for (const p of matchedProducts ?? []) {
      if (p.barcode) productMap.set(String(p.barcode).trim(), p);
    }

    // 3. Process each file serially — safe, no Supabase hammering
    const VALID_EXTS = new Set(["jpg", "jpeg", "png", "webp"]);
    const VALID_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

    let matched = 0;
    let unmatched = 0;
    let failed = 0;
    const unmatchedFilenames: string[] = [];

    for (const file of files) {
      const barcode = file.originalname.replace(/\.[^.]+$/, "").trim();
      const ext = (file.originalname.split(".").pop() ?? "").toLowerCase();

      // Reject unsupported file types
      if (!VALID_MIMES.has(file.mimetype) && !VALID_EXTS.has(ext)) {
        failed++;
        continue;
      }

      const product = productMap.get(barcode);
      if (!product) {
        unmatched++;
        unmatchedFilenames.push(file.originalname);
        continue;
      }

      try {
        // Upload image to the existing product-images bucket
        const timestamp = Date.now();
        const random = Math.random().toString(36).slice(2, 8);
        const storagePath = `products/${timestamp}-${random}.${ext || "jpg"}`;

        const { error: storageError } = await supabaseAdmin.storage
          .from("product-images")
          .upload(storagePath, file.buffer, {
            contentType: file.mimetype || "image/jpeg",
            upsert: false,
          });

        if (storageError) throw storageError;

        const { data: urlData } = supabaseAdmin.storage
          .from("product-images")
          .getPublicUrl(storagePath);

        // Update ONLY image_url — no other field is touched
        const { error: updateError } = await supabaseAdmin
          .from("products")
          .update({ image_url: urlData.publicUrl })
          .eq("id", product.id);

        if (updateError) throw updateError;

        matched++;
      } catch (err: any) {
        console.error(`[bulk-images] Failed for ${file.originalname}:`, err.message);
        failed++;
      }
    }

    return res.json({
      success: true,
      matched,
      unmatched,
      failed,
      unmatched_filenames: unmatchedFilenames,
    });
  } catch (err: any) {
    console.error("Bulk image upload error:", err);
    return res.status(500).json({ error: "Bulk upload failed", message: err.message });
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
