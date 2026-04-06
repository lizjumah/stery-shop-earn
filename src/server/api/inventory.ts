import { Router, Request, Response } from "express";
import multer from "multer";
import * as XLSX from "xlsx";
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

  // Normalize: lowercase + strip quotes + trim + spaces→underscore
  const normalizeCsvHeader = (h: string) =>
    h.toLowerCase().replace(/"/g, "").trim().replace(/\s+/g, "_");
  const header = parseCSVLine(lines[0]).map(normalizeCsvHeader);

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

      // Resolve barcode and stock columns from common aliases
      const BARCODE_ALIASES = ["barcode", "item_number", "item_no"];
      const STOCK_ALIASES   = ["stock", "quantity", "qty", "on_hand"];
      const barcodeKey = BARCODE_ALIASES.find((k) => header.includes(k));
      const stockKey   = STOCK_ALIASES.find((k) => header.includes(k));

      if (!barcodeKey || !stockKey) {
        return res.status(400).json({
          error: `CSV is missing required columns. ` +
            `Barcode column not found (tried: ${BARCODE_ALIASES.join(", ")}). ` +
            `Stock column not found (tried: ${STOCK_ALIASES.join(", ")}). ` +
            `Detected headers: ${header.join(", ")}`,
        });
      }

      // 2. Track first-seen index for each barcode to detect duplicates
      const seenBarcodes = new Map<string, number>(); // barcode → first row index
      const duplicateBarcodeSet = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const bc = rows[i][barcodeKey]?.trim();
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
        const barcode = row[barcodeKey]?.trim();
        const stockRaw = row[stockKey]?.trim();

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
            stock_in_file: isNaN(stockNum) ? 0 : Math.round(stockNum),
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

// ── POS Stock Upload ──────────────────────────────────────────────────────────
//
// Accepts the raw POS Excel / CSV export. Parses report-style files, extracts
// valid product rows, matches by barcode, and updates stock_quantity.
//
// POST /pos-upload/preview  — parse file, match barcodes, return preview
// POST /pos-upload/:id/apply — apply matched stock updates
// GET  /pos-upload/history   — last 20 uploads
// GET  /pos-upload/unmatched/:id — CSV download of unmatched / invalid rows

const posUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const validExts = [".csv", ".xls", ".xlsx"];
    const validMimes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ];
    if (validExts.some((ext) => name.endsWith(ext)) || validMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV, XLS, and XLSX files are allowed"));
    }
  },
});

/**
 * Convert an Excel cell value to a string, preserving the exact barcode text.
 * - Numbers are stringified via String() — safe for EAN-13 barcodes (13 digits,
 *   well within Number.MAX_SAFE_INTEGER) and decimals like 1002002.0025.
 * - Strings are trimmed as-is.
 */
function cellToSafeString(value: any): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value).trim();
  return String(value).trim();
}

interface ParsedPosRow {
  barcode: string;
  description: string;
  onHand: number | null;
  price: number | null;
  category: string | null;
  rowIndex: number;
  status: "valid" | "invalid";
  invalidReason?: string;
}

/**
 * Parse a POS stock report (XLS / XLSX / CSV) into product rows.
 *
 * The report is a "report-style" file:
 *   - store name / title / date rows at the top  (ignored)
 *   - a header row containing "item_number"       (anchor row)
 *   - category heading rows between products       (tracked for context)
 *   - actual product rows with item_number + Description + On Hand
 *
 * Barcode safety:
 *   item_number cells are converted via cellToSafeString() — numeric cells
 *   use String(v) which never produces scientific notation for safe integers.
 */
function parsePosFile(buffer: Buffer): ParsedPosRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: true });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const aoa: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    raw: true,
    defval: null,
  }) as any[][];

  // Find the header row by looking for a cell whose normalized text matches
  // any known barcode column name. Normalization: lowercase + trim + spaces→underscore.
  const BARCODE_HEADER_ALIASES = new Set([
    "item_number",
    "item_no",
    "barcode",
  ]);
  const normalizeHeader = (v: any): string =>
    String(v).toLowerCase().trim().replace(/\s+/g, "_");

  let headerRowIdx = -1;
  const colMap: Record<string, number> = {};

  for (let i = 0; i < Math.min(aoa.length, 40); i++) {
    const row = aoa[i];
    if (!row) continue;
    for (let j = 0; j < row.length; j++) {
      if (
        row[j] != null &&
        BARCODE_HEADER_ALIASES.has(normalizeHeader(row[j]))
      ) {
        headerRowIdx = i;
        row.forEach((h: any, idx: number) => {
          if (h != null) colMap[normalizeHeader(h)] = idx;
        });
        break;
      }
    }
    if (headerRowIdx >= 0) break;
  }

  if (headerRowIdx < 0) {
    throw new Error(
      'Could not find the header row. Expected a row containing one of: ' +
      '"item_number", "item_no", "barcode" (case-insensitive). ' +
      "Check that the file is an unmodified POS export."
    );
  }

  // Resolve barcode column — check all normalized alias keys in priority order
  const itemNumCol =
    colMap["item_number"] ??
    colMap["item_no"] ??
    colMap["barcode"];
  const descCol    = colMap["description"];
  // Resolve stock column — check aliases in priority order
  const onHandCol  =
    colMap["on_hand"] ??
    colMap["stock"] ??
    colMap["qty"] ??
    colMap["quantity"];
  const priceCol   = colMap["price"];

  if (itemNumCol === undefined || descCol === undefined) {
    throw new Error(
      `Required columns "item_number" and "Description" not found. ` +
      `Detected columns: ${Object.keys(colMap).join(", ")}`
    );
  }

  const rows: ParsedPosRow[] = [];
  let currentCategory: string | null = null;

  for (let i = headerRowIdx + 1; i < aoa.length; i++) {
    const row = aoa[i];
    if (!row) continue;

    // Skip entirely blank rows
    if (row.every((c: any) => c == null || String(c).trim() === "")) continue;

    const itemNumRaw = row[itemNumCol];
    const descRaw    = row[descCol];

    // Category heading row: item_number cell is empty
    if (itemNumRaw == null || String(itemNumRaw).trim() === "") {
      const texts = row
        .filter((c: any) => c != null && String(c).trim() !== "")
        .map((c: any) => String(c).trim());
      // Category rows have 1–3 text cells, none of which are pure numbers
      if (texts.length >= 1 && texts.length <= 3 && texts.every((t) => isNaN(Number(t)))) {
        currentCategory = texts[0];
      }
      continue;
    }

    const barcode     = cellToSafeString(itemNumRaw);
    const description = descRaw != null ? String(descRaw).trim() : "";

    if (!barcode) {
      rows.push({ barcode: "", description, onHand: null, price: null, category: currentCategory, rowIndex: i + 1, status: "invalid", invalidReason: "Missing barcode" });
      continue;
    }
    if (!description) {
      rows.push({ barcode, description: "", onHand: null, price: null, category: currentCategory, rowIndex: i + 1, status: "invalid", invalidReason: "Missing description" });
      continue;
    }

    // Parse On Hand — required, must be a non-negative number
    const onHandRaw = onHandCol !== undefined ? row[onHandCol] : null;
    let onHand: number | null = null;
    if (onHandRaw != null && String(onHandRaw).trim() !== "") {
      const parsed = parseFloat(String(onHandRaw));
      if (!isNaN(parsed) && parsed >= 0) onHand = Math.round(parsed);
    }

    if (onHand === null) {
      rows.push({ barcode, description, onHand: null, price: null, category: currentCategory, rowIndex: i + 1, status: "invalid", invalidReason: "Invalid or missing On Hand value" });
      continue;
    }

    const priceRaw = priceCol !== undefined ? row[priceCol] : null;
    const price =
      priceRaw != null && String(priceRaw).trim() !== ""
        ? parseFloat(String(priceRaw)) || null
        : null;

    rows.push({ barcode, description, onHand, price, category: currentCategory, rowIndex: i + 1, status: "valid" });
  }

  return rows;
}

// ── POST /api/admin/inventory/pos-upload/preview ──────────────────────────────
router.post(
  "/pos-upload/preview",
  posUpload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const file = (req as any).file;
      if (!file) return res.status(400).json({ error: "No file provided" });

      let parsedRows: ParsedPosRow[];
      try {
        parsedRows = parsePosFile(file.buffer);
      } catch (parseErr: any) {
        return res.status(400).json({ error: parseErr.message });
      }

      if (parsedRows.length === 0) {
        return res.status(400).json({
          error: "No product rows found. Verify the file is an unmodified POS stock export.",
        });
      }

      // Collect unique barcodes from valid rows for DB lookup
      const validRows = parsedRows.filter((r) => r.status === "valid");
      const uniqueBarcodes = [...new Set(validRows.map((r) => r.barcode))];

      const FETCH_BATCH = 500;
      const productMap = new Map<string, { id: string; name: string; stock_quantity: number | null }>();

      for (let i = 0; i < uniqueBarcodes.length; i += FETCH_BATCH) {
        const batch = uniqueBarcodes.slice(i, i + FETCH_BATCH);
        const { data, error } = await supabaseAdmin
          .from("products")
          .select("id, barcode, name, stock_quantity")
          .in("barcode", batch);
        if (error) throw error;
        for (const p of data || []) {
          if (p.barcode) productMap.set(String(p.barcode).trim(), p);
        }
      }

      // Classify every parsed row
      type ItemToStore = {
        barcode: string;
        pos_description: string;
        pos_stock: number | null;
        pos_price: number | null;
        pos_category: string | null;
        product_id: string | null;
        product_name: string | null;
        current_stock: number | null;
        status: string;
        invalid_reason: string | null;
        row_number: number;
      };

      let totalRows = 0;
      let matchedRows = 0;
      let unmatchedRows = 0;
      let invalidRows = 0;
      const itemsToStore: ItemToStore[] = [];

      for (const row of parsedRows) {
        totalRows++;

        if (row.status === "invalid") {
          invalidRows++;
          itemsToStore.push({
            barcode: row.barcode,
            pos_description: row.description,
            pos_stock: null,
            pos_price: row.price,
            pos_category: row.category,
            product_id: null,
            product_name: null,
            current_stock: null,
            status: "invalid",
            invalid_reason: row.invalidReason ?? null,
            row_number: row.rowIndex,
          });
          continue;
        }

        const product = productMap.get(row.barcode);
        if (!product) {
          unmatchedRows++;
          itemsToStore.push({
            barcode: row.barcode,
            pos_description: row.description,
            pos_stock: row.onHand,
            pos_price: row.price,
            pos_category: row.category,
            product_id: null,
            product_name: null,
            current_stock: null,
            status: "unmatched",
            invalid_reason: null,
            row_number: row.rowIndex,
          });
          continue;
        }

        matchedRows++;
        itemsToStore.push({
          barcode: row.barcode,
          pos_description: row.description,
          pos_stock: row.onHand,
          pos_price: row.price,
          pos_category: row.category,
          product_id: product.id,
          product_name: product.name,
          current_stock: product.stock_quantity ?? 0,
          status: "matched",
          invalid_reason: null,
          row_number: row.rowIndex,
        });
      }

      // Create upload log record
      const { data: uploadLog, error: uploadError } = await supabaseAdmin
        .from("pos_upload_logs")
        .insert({
          file_name: file.originalname,
          uploaded_by: (req as any).adminId ?? null,
          total_rows: totalRows,
          matched_rows: matchedRows,
          unmatched_rows: unmatchedRows,
          invalid_rows: invalidRows,
          status: "previewed",
        })
        .select()
        .single();
      if (uploadError) throw uploadError;

      // Insert items in batches of 200
      const ITEM_BATCH = 200;
      for (let i = 0; i < itemsToStore.length; i += ITEM_BATCH) {
        const batch = itemsToStore
          .slice(i, i + ITEM_BATCH)
          .map((item) => ({ ...item, upload_id: uploadLog.id }));
        const { error: itemErr } = await supabaseAdmin
          .from("pos_upload_items")
          .insert(batch);
        if (itemErr) throw itemErr;
      }

      // Return first 50 of each status for inline preview
      const PREVIEW_SIZE = 50;
      const matchedPreview  = itemsToStore.filter((r) => r.status === "matched").slice(0, PREVIEW_SIZE);
      const unmatchedPreview = itemsToStore.filter((r) => r.status === "unmatched").slice(0, PREVIEW_SIZE);

      return res.json({
        success: true,
        upload_id: uploadLog.id,
        summary: { total_rows: totalRows, matched_rows: matchedRows, unmatched_rows: unmatchedRows, invalid_rows: invalidRows },
        matched_preview: matchedPreview,
        unmatched_preview: unmatchedPreview,
      });
    } catch (err: any) {
      console.error("POS upload preview error:", err);
      return res.status(500).json({ error: "Preview failed", message: err.message });
    }
  }
);

// ── POST /api/admin/inventory/pos-upload/:id/apply ────────────────────────────
router.post("/pos-upload/:id/apply", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: uploadLog, error: logErr } = await supabaseAdmin
      .from("pos_upload_logs")
      .select("id, status, matched_rows")
      .eq("id", id)
      .single();

    if (logErr || !uploadLog) return res.status(404).json({ error: "Upload not found" });
    if (uploadLog.status === "applied") return res.status(400).json({ error: "Already applied" });

    const { data: matchedItems, error: itemsErr } = await supabaseAdmin
      .from("pos_upload_items")
      .select("product_id, pos_stock, current_stock")
      .eq("upload_id", id)
      .eq("status", "matched");

    if (itemsErr) throw itemsErr;

    if (!matchedItems || matchedItems.length === 0) {
      await supabaseAdmin
        .from("pos_upload_logs")
        .update({ status: "applied", applied_at: new Date().toISOString(), updated_rows: 0 })
        .eq("id", id);
      return res.json({ success: true, updated: 0, message: "No matched products to update" });
    }

    const CONCURRENCY = 20;
    let updated = 0;
    const errors: string[] = [];

    for (let i = 0; i < matchedItems.length; i += CONCURRENCY) {
      const batch = matchedItems.slice(i, i + CONCURRENCY).filter((item) => item.product_id);
      const results = await Promise.allSettled(
        batch.map((item) => {
          const qty = Number(item.pos_stock ?? 0);
          const stockStatus = qty === 0 ? "out_of_stock" : qty <= 5 ? "low_stock" : "in_stock";
          return supabaseAdmin
            .from("products")
            .update({ stock_quantity: qty, stock_status: stockStatus, in_stock: qty > 0 })
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
            const item = batch[j];
            logActivity({
              entity_type: "product",
              entity_id: item.product_id!,
              action: "updated",
              field_changed: "stock_quantity",
              old_value: String(item.current_stock ?? 0),
              new_value: String(item.pos_stock ?? 0),
              changed_by: (req as any).adminId ?? "unknown",
              source: "admin_dashboard",
            }).catch(console.error);
          }
        } else {
          errors.push(String(result.reason));
        }
      }
    }

    await supabaseAdmin
      .from("pos_upload_logs")
      .update({
        status: "applied",
        applied_at: new Date().toISOString(),
        updated_rows: updated,
        failed_rows: errors.length,
      })
      .eq("id", id);

    await logAdminAction(
      "POS_STOCK_UPLOAD_APPLY",
      "pos_upload",
      id,
      { status: "previewed" },
      { status: "applied", updated },
      (req as any).adminId!
    );

    return res.json({ success: true, updated, ...(errors.length > 0 && { errors }) });
  } catch (err: any) {
    console.error("POS upload apply error:", err);
    return res.status(500).json({ error: "Apply failed", message: err.message });
  }
});

// ── GET /api/admin/inventory/pos-upload/history ───────────────────────────────
router.get("/pos-upload/history", async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("pos_upload_logs")
      .select("id, file_name, uploaded_by, total_rows, matched_rows, unmatched_rows, invalid_rows, updated_rows, status, applied_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return res.json({ success: true, uploads: data || [] });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to fetch history", message: err.message });
  }
});

// ── GET /api/admin/inventory/pos-upload/unmatched/:id ────────────────────────
// Returns unmatched + invalid rows as a CSV download.
router.get("/pos-upload/unmatched/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin
      .from("pos_upload_items")
      .select("barcode, pos_description, pos_stock, pos_category, status, invalid_reason")
      .eq("upload_id", id)
      .in("status", ["unmatched", "invalid"])
      .order("row_number", { ascending: true });
    if (error) throw error;

    const rows = data || [];
    const esc = (val: any): string => {
      if (val == null) return "";
      const s = String(val);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const header = "Barcode,Description,POS Stock,Category,Status,Reason";
    const lines = rows.map((r) =>
      [r.barcode, r.pos_description, r.pos_stock, r.pos_category, r.status, r.invalid_reason]
        .map(esc)
        .join(",")
    );
    const csv = [header, ...lines].join("\n");
    const filename = `pos_unmatched_${id.slice(0, 8)}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err: any) {
    return res.status(500).json({ error: "Export failed", message: err.message });
  }
});

export default router;
