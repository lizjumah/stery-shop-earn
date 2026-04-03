import { Router, Request, Response } from "express";
import multer from "multer";
import { verifyAdmin, logAdminAction, supabaseAdmin } from "../middleware/auth";
import { logActivity } from "../lib/logActivity";

const router = Router();
router.use(verifyAdmin);

// Separate multer instance for CSV uploads only
const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB — plenty for 10k rows
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.originalname.toLowerCase().endsWith(".csv")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// ── CSV Parser ────────────────────────────────────────────────────────────────

/** Parse a single CSV line respecting double-quoted fields and escaped quotes. */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/** Parse a full CSV buffer into an array of row objects keyed by header name. */
function parseCSV(
  buffer: Buffer
): { header: string[]; rows: Array<Record<string, string>> } {
  const text = buffer
    .toString("utf-8")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { header: [], rows: [] };

  const header = parseCSVLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/"/g, "").trim()
  );

  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    header.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").trim();
    });
    rows.push(row);
  }

  return { header, rows };
}

// ── POST /api/admin/inventory/analyze ─────────────────────────────────────────
/*
  Upload a CSV file, parse it, match barcodes against the products table,
  classify every row, save analysis results, and return a summary + first
  page of changed/unmatched rows.

  Does NOT update any product stock — read-only analysis step.

  10k-row safety:
  - Products fetched in one batched IN query (500 barcodes per trip).
  - Only non-unchanged items are stored (changed + unmatched + invalid).
  - Items inserted to DB in batches of 200.
*/
router.post(
  "/analyze",
  csvUpload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const file = (req as any).file;
      if (!file) return res.status(400).json({ error: "No CSV file provided" });

      const { stock_date, notes } = req.body;
      if (!stock_date)
        return res.status(400).json({ error: "stock_date is required" });

      // 1. Parse CSV
      const { header, rows } = parseCSV(file.buffer);

      if (!header.includes("barcode") || !header.includes("stock")) {
        return res.status(400).json({
          error: "CSV must contain 'barcode' and 'stock' columns",
        });
      }

      // 2. Track first-seen index for each barcode to detect duplicates
      const seenBarcodes = new Map<string, number>(); // barcode → first row index
      const duplicateBarcodeSet = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const bc = rows[i]["barcode"]?.trim();
        if (!bc) continue;
        if (seenBarcodes.has(bc)) {
          duplicateBarcodeSet.add(bc);
        } else {
          seenBarcodes.set(bc, i);
        }
      }

      const uniqueBarcodes = Array.from(seenBarcodes.keys());

      // 3. Fetch all matching products in batches of 500 (one index scan per batch)
      const FETCH_BATCH = 500;
      const productMap = new Map<
        string,
        { id: string; stock_quantity: number | null; name: string }
      >();

      for (let i = 0; i < uniqueBarcodes.length; i += FETCH_BATCH) {
        const batch = uniqueBarcodes.slice(i, i + FETCH_BATCH);
        const { data, error } = await supabaseAdmin
          .from("products")
          .select("id, barcode, stock_quantity, name")
          .in("barcode", batch);

        if (error) throw error;
        for (const p of data || []) {
          if (p.barcode) productMap.set(String(p.barcode).trim(), p);
        }
      }

      // 4. Classify every CSV row
      let totalRows = 0;
      let matchedRows = 0;
      let changedRows = 0;
      let unchangedRows = 0;
      let unmatchedRows = 0;
      let invalidRows = 0;
      const duplicateBarcodes = duplicateBarcodeSet.size;

      // Only store actionable items (changed / unmatched / invalid)
      // Unchanged rows are counted but not persisted — keeps storage lean at 10k rows
      type ItemRow = {
        barcode: string;
        product_id: string | null;
        product_name: string | null;
        stock_in_file: number;
        stock_in_db: number | null;
        status: string;
        row_number: number;
      };
      const itemsToStore: ItemRow[] = [];

      for (let i = 0; i < rows.length; i++) {
        totalRows++;
        const row = rows[i];
        const barcode = row["barcode"]?.trim();
        const stockRaw = row["stock"]?.trim();

        // Skip duplicate occurrences — only process first occurrence, count rest as invalid
        if (
          barcode &&
          duplicateBarcodeSet.has(barcode) &&
          seenBarcodes.get(barcode) !== i
        ) {
          invalidRows++;
          continue;
        }

        // Validate: barcode required, stock must be a non-negative integer
        const stockNum = Number(stockRaw);
        if (
          !barcode ||
          stockRaw === "" ||
          stockRaw === undefined ||
          isNaN(stockNum) ||
          stockNum < 0
        ) {
          invalidRows++;
          itemsToStore.push({
            barcode: barcode || "",
            product_id: null,
            product_name: row["product_name"] || null,
            stock_in_file: isNaN(stockNum) ? 0 : stockNum,
            stock_in_db: null,
            status: "invalid",
            row_number: i + 2, // +1 for 1-based, +1 for header row
          });
          continue;
        }

        const stockInFile = Math.round(stockNum);
        const product = productMap.get(barcode);

        if (!product) {
          unmatchedRows++;
          itemsToStore.push({
            barcode,
            product_id: null,
            product_name: row["product_name"] || null,
            stock_in_file: stockInFile,
            stock_in_db: null,
            status: "unmatched",
            row_number: i + 2,
          });
          continue;
        }

        matchedRows++;
        const stockInDb = product.stock_quantity ?? 0;

        if (stockInFile !== stockInDb) {
          changedRows++;
          itemsToStore.push({
            barcode,
            product_id: product.id,
            product_name: product.name,
            stock_in_file: stockInFile,
            stock_in_db: stockInDb,
            status: "changed",
            row_number: i + 2,
          });
        } else {
          unchangedRows++;
          // Not stored — unchanged rows only contribute to the count
        }
      }

      // 5. Create the upload record
      const { data: upload, error: uploadError } = await supabaseAdmin
        .from("inventory_uploads")
        .insert({
          file_name: file.originalname,
          stock_date,
          notes: notes || null,
          uploaded_by: req.adminId,
          status: "analyzed",
          total_rows: totalRows,
          matched_rows: matchedRows,
          changed_rows: changedRows,
          unchanged_rows: unchangedRows,
          unmatched_rows: unmatchedRows,
          invalid_rows: invalidRows,
          duplicate_barcodes: duplicateBarcodes,
        })
        .select()
        .single();

      if (uploadError) throw uploadError;

      // 6. Insert actionable items in batches of 200
      const ITEM_BATCH = 200;
      for (let i = 0; i < itemsToStore.length; i += ITEM_BATCH) {
        const batch = itemsToStore
          .slice(i, i + ITEM_BATCH)
          .map((item) => ({ ...item, upload_id: upload.id }));

        const { error: itemError } = await supabaseAdmin
          .from("inventory_upload_items")
          .insert(batch);

        if (itemError) throw itemError;
      }

      await logAdminAction(
        "INVENTORY_UPLOAD_ANALYZE",
        "inventory_upload",
        upload.id,
        null,
        {
          file_name: file.originalname,
          total_rows: totalRows,
          changed_rows: changedRows,
        },
        req.adminId!
      );

      // 7. Return summary + first page (20 rows) of changed and unmatched
      const PAGE_SIZE = 20;
      const changedPreview = itemsToStore
        .filter((it) => it.status === "changed")
        .slice(0, PAGE_SIZE);
      const unmatchedPreview = itemsToStore
        .filter((it) => it.status === "unmatched")
        .slice(0, PAGE_SIZE);

      return res.json({
        success: true,
        upload_id: upload.id,
        summary: {
          total_rows: totalRows,
          matched_rows: matchedRows,
          changed_rows: changedRows,
          unchanged_rows: unchangedRows,
          unmatched_rows: unmatchedRows,
          invalid_rows: invalidRows,
          duplicate_barcodes: duplicateBarcodes,
        },
        changed_preview: changedPreview,
        unmatched_preview: unmatchedPreview,
      });
    } catch (err: any) {
      console.error("Inventory analyze error:", err);
      return res
        .status(500)
        .json({ error: "Analysis failed", message: err.message });
    }
  }
);

// ── GET /api/admin/inventory/uploads/:id/preview ──────────────────────────────
/*
  Paginated preview of items for a given upload.
  ?status=changed|unmatched|invalid  (default: changed)
  ?page=1  (default: 1, page size: 20)
*/
router.get("/uploads/:id/preview", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const status = (req.query.status as string) || "changed";
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const PAGE_SIZE = 20;
    const offset = (page - 1) * PAGE_SIZE;

    const { data, error, count } = await supabaseAdmin
      .from("inventory_upload_items")
      .select("*", { count: "exact" })
      .eq("upload_id", id)
      .eq("status", status)
      .order("row_number", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    return res.json({
      success: true,
      items: data || [],
      total: count ?? 0,
      page,
      page_size: PAGE_SIZE,
    });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: "Preview failed", message: err.message });
  }
});

// ── POST /api/admin/inventory/uploads/:id/apply ───────────────────────────────
/*
  Apply stock changes for a previously analyzed upload.
  - Only updates products.stock_quantity / stock_status / in_stock
  - Does NOT touch price, category, subcategory, or any other field
  - Idempotent guard: returns 400 if already applied
  - Processes in concurrent groups of 20 to handle large change sets efficiently
*/
router.post("/uploads/:id/apply", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Guard: verify upload exists and has not already been applied
    const { data: upload, error: uploadError } = await supabaseAdmin
      .from("inventory_uploads")
      .select("id, status, changed_rows")
      .eq("id", id)
      .single();

    if (uploadError || !upload) {
      return res.status(404).json({ error: "Upload not found" });
    }
    if (upload.status === "applied") {
      return res
        .status(400)
        .json({ error: "This upload has already been applied" });
    }

    // Fetch all changed items for this upload (stock_in_db needed for activity log)
    const { data: changedItems, error: itemsError } = await supabaseAdmin
      .from("inventory_upload_items")
      .select("product_id, stock_in_file, stock_in_db")
      .eq("upload_id", id)
      .eq("status", "changed");

    if (itemsError) throw itemsError;
    if (!changedItems || changedItems.length === 0) {
      // Mark as applied even when there's nothing to do
      await supabaseAdmin
        .from("inventory_uploads")
        .update({ status: "applied", applied_at: new Date().toISOString() })
        .eq("id", id);
      return res.json({ success: true, updated: 0, message: "No changes to apply" });
    }

    // Apply in concurrent groups of 20 for throughput without hammering Supabase
    const CONCURRENCY = 20;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < changedItems.length; i += CONCURRENCY) {
      const batch = changedItems.slice(i, i + CONCURRENCY);

      const filteredBatch = batch.filter((item) => item.product_id);

      const results = await Promise.allSettled(
        filteredBatch.map((item) => {
          const qty = item.stock_in_file;
          const stockStatus =
            qty === 0 ? "out_of_stock" : qty <= 5 ? "low_stock" : "in_stock";

          return supabaseAdmin
            .from("products")
            .update({
              stock_quantity: qty,
              stock_status: stockStatus,
              in_stock: qty > 0,
            })
            .eq("id", item.product_id);
        })
      );

      for (let j = 0; j < results.length; j++) {
        const result = results[j];
        if (result.status === "fulfilled") {
          if (result.value.error) {
            errors.push(result.value.error.message);
          } else {
            updated++;
            // Log stock quantity change per product (non-blocking)
            const item = filteredBatch[j];
            if (Number(item.stock_in_db ?? 0) !== Number(item.stock_in_file)) {
              logActivity({
                entity_type:   "product",
                entity_id:     item.product_id!,
                action:        "updated",
                field_changed: "stock_quantity",
                old_value:     String(item.stock_in_db ?? 0),
                new_value:     String(item.stock_in_file),
                changed_by:    req.adminId ?? "unknown",
                source:        "admin_dashboard",
              }).catch(console.error);
            }
          }
        } else {
          errors.push(String(result.reason));
        }
      }
    }

    // Mark upload as applied
    await supabaseAdmin
      .from("inventory_uploads")
      .update({ status: "applied", applied_at: new Date().toISOString() })
      .eq("id", id);

    await logAdminAction(
      "INVENTORY_UPLOAD_APPLY",
      "inventory_upload",
      id,
      { status: "analyzed" },
      { status: "applied", updated },
      req.adminId!
    );

    return res.json({
      success: true,
      updated,
      ...(errors.length > 0 && { errors }),
    });
  } catch (err: any) {
    console.error("Inventory apply error:", err);
    return res
      .status(500)
      .json({ error: "Apply failed", message: err.message });
  }
});

// ── GET /api/admin/inventory/history ─────────────────────────────────────────
/*
  Last 20 uploads ordered newest first, for the history section at the
  bottom of the page. No pagination needed at this stage.
*/
router.get("/history", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("inventory_uploads")
      .select(
        "id, file_name, stock_date, notes, status, total_rows, changed_rows, applied_at, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return res.json({ success: true, uploads: data || [] });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: "Failed to fetch history", message: err.message });
  }
});

// ── GET /api/admin/inventory/overview ────────────────────────────────────────
/*
  Returns aggregated stats from the products table for the Overview page.
  Fetches minimal columns and computes all counts server-side — safe for 10k rows.
*/
router.get("/overview", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("stock_quantity, stock_status, barcode, category, cost_price");

    if (error) throw error;
    const rows = data || [];

    const totalProducts = rows.length;
    const totalStockUnits = rows.reduce(
      (sum, p) => sum + (p.stock_quantity ?? 0),
      0
    );
    const outOfStock = rows.filter(
      (p) => (p.stock_quantity ?? 0) <= 0 || p.stock_status === "out_of_stock"
    ).length;
    const lowStock = rows.filter((p) => p.stock_status === "low_stock").length;
    const missingBarcode = rows.filter(
      (p) => !p.barcode || String(p.barcode).trim() === ""
    ).length;
    const missingCategory = rows.filter(
      (p) => !p.category || String(p.category).trim() === ""
    ).length;

    return res.json({
      success: true,
      stats: {
        total_products: totalProducts,
        total_stock_units: totalStockUnits,
        out_of_stock: outOfStock,
        low_stock: lowStock,
        missing_barcode: missingBarcode,
        missing_category: missingCategory,
      },
    });
  } catch (err: any) {
    console.error("Inventory overview error:", err);
    return res
      .status(500)
      .json({ error: "Overview failed", message: err.message });
  }
});

// ── GET /api/admin/inventory/products/filters ─────────────────────────────────
/*
  Returns distinct categories and subcategories for the Master Inventory filter
  dropdowns. Cheap: only fetches two text columns.
*/
router.get("/products/filters", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("products")
      .select("category, subcategory");

    if (error) throw error;
    const rows = data || [];

    const categories = [
      ...new Set(rows.map((p) => p.category).filter(Boolean)),
    ].sort() as string[];
    const subcategories = [
      ...new Set(rows.map((p) => p.subcategory).filter(Boolean)),
    ].sort() as string[];

    return res.json({ success: true, categories, subcategories });
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: "Failed to fetch filters", message: err.message });
  }
});

// ── GET /api/admin/inventory/products/export ──────────────────────────────────
/*
  Streams all filtered products as a CSV download.
  Accepts the same query params as GET /products (no pagination).
  Safe for 10k rows — no package dependencies, pure string building.
*/
router.get("/products/export", async (req: Request, res: Response) => {
  try {
    const { search, category, subcategory, status, missing } =
      req.query as Record<string, string>;

    let query = supabaseAdmin
      .from("products")
      .select(
        "name, barcode, category, subcategory, cost_price, price, stock_quantity, stock_status, updated_at"
      );

    if (search?.trim()) {
      const term = search.trim();
      query = query.or(`name.ilike.%${term}%,barcode.ilike.%${term}%`);
    }
    if (category) query = query.eq("category", category);
    if (subcategory) query = query.eq("subcategory", subcategory);
    if (status) query = query.eq("stock_status", status);
    if (missing === "barcode")
      query = query.or("barcode.is.null,barcode.eq.");
    if (missing === "category")
      query = query.or("category.is.null,category.eq.");
    if (missing === "cost_price")
      query = query.or("cost_price.is.null,cost_price.eq.0");

    const { data, error } = await query.order("name", { ascending: true });
    if (error) throw error;

    const rows = data || [];

    const esc = (val: any): string => {
      if (val == null) return "";
      const s = String(val);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const header = [
      "Name",
      "Barcode",
      "Category",
      "Subcategory",
      "Cost Price",
      "Selling Price",
      "Stock Qty",
      "Stock Status",
      "Last Updated",
    ].join(",");

    const lines = rows.map((p) =>
      [
        p.name,
        p.barcode ?? "",
        p.category ?? "",
        p.subcategory ?? "",
        p.cost_price ?? "",
        p.price,
        p.stock_quantity ?? 0,
        p.stock_status ?? "",
        p.updated_at
          ? new Date(p.updated_at).toLocaleDateString("en-GB")
          : "",
      ]
        .map(esc)
        .join(",")
    );

    const csv = [header, ...lines].join("\n");
    const filename = `inventory_${new Date().toISOString().split("T")[0]}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    return res.send(csv);
  } catch (err: any) {
    console.error("Inventory export error:", err);
    return res
      .status(500)
      .json({ error: "Export failed", message: err.message });
  }
});

// ── GET /api/admin/inventory/products ─────────────────────────────────────────
/*
  Paginated, filtered product list for Master Inventory.

  Query params:
    page        — 1-based page number (default 1)
    search      — partial match on name or barcode
    category    — exact category filter
    subcategory — exact subcategory filter
    status      — stock_status: in_stock | low_stock | out_of_stock
    missing     — barcode | category | cost_price

  Returns { products, total, page, page_size }
*/
router.get("/products", async (req: Request, res: Response) => {
  try {
    const { search, category, subcategory, status, missing } =
      req.query as Record<string, string>;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const PAGE_SIZE = 50;
    const offset = (page - 1) * PAGE_SIZE;

    let query = supabaseAdmin
      .from("products")
      .select(
        "id, name, barcode, category, subcategory, cost_price, price, stock_quantity, stock_status, updated_at",
        { count: "exact" }
      );

    if (search?.trim()) {
      const term = search.trim();
      query = query.or(`name.ilike.%${term}%,barcode.ilike.%${term}%`);
    }
    if (category) query = query.eq("category", category);
    if (subcategory) query = query.eq("subcategory", subcategory);
    if (status) query = query.eq("stock_status", status);
    if (missing === "barcode")
      query = query.or("barcode.is.null,barcode.eq.");
    if (missing === "category")
      query = query.or("category.is.null,category.eq.");
    if (missing === "cost_price")
      query = query.or("cost_price.is.null,cost_price.eq.0");

    const { data, error, count } = await query
      .order("name", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) throw error;

    return res.json({
      success: true,
      products: data || [],
      total: count ?? 0,
      page,
      page_size: PAGE_SIZE,
    });
  } catch (err: any) {
    console.error("Inventory products error:", err);
    return res
      .status(500)
      .json({ error: "Failed to fetch products", message: err.message });
  }
});

export default router;
