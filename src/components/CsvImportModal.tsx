import { useRef, useState } from "react";
import { X, Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api/client";
import { subcategoryConfig } from "@/data/products";
import { toast } from "sonner";

// ─── Category / subcategory mapping ──────────────────────────────────────────

/**
 * Official category names, lower-cased for comparison.
 * Derived from subcategoryConfig so there's a single source of truth.
 */
const OFFICIAL_CATEGORIES = Object.keys(subcategoryConfig);

const OFFICIAL_CATEGORIES_LOWER = new Map<string, string>(
  OFFICIAL_CATEGORIES.map((c) => [c.toLowerCase(), c])
);

/** Resolve a raw category string to an official category name or null. */
function resolveCategory(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return OFFICIAL_CATEGORIES_LOWER.get(trimmed.toLowerCase()) ?? null;
}

/** Resolve a raw subcategory string given an already-resolved category. */
function resolveSubcategory(rawSub: string, resolvedCategory: string): string {
  const trimmed = rawSub.trim();
  const subs = subcategoryConfig[resolvedCategory] ?? [];
  const subsLower = new Map<string, string>(subs.map((s) => [s.toLowerCase(), s]));
  return subsLower.get(trimmed.toLowerCase()) ?? "General";
}

// ─── Header synonym resolution ────────────────────────────────────────────────

/** Map a normalised header string to a canonical field name. */
function resolveHeader(raw: string): string {
  const h = raw.trim().toLowerCase().replace(/[-_ ]+/g, " ");
  if (h === "name" || h === "product name" || h === "product") return "name";
  if (h === "barcode" || h === "ean" || h === "sku") return "barcode";
  if (h === "price" || h === "selling price" || h === "unit price") return "price";
  if (h === "cost price" || h === "cost" || h === "buy price") return "cost_price";
  if (h === "stock" || h === "quantity" || h === "qty" || h === "stock quantity") return "stock";
  if (h === "category" || h === "department") return "category";
  if (h === "subcategory" || h === "sub category" || h === "sub-category" || h === "sub_category") return "subcategory";
  return h; // unknown — keep as-is so it's just ignored
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ValidRow {
  name: string;
  barcode?: string;
  price: number;
  cost_price?: number;
  stock: number;
  category?: string;
  subcategory?: string;
  /** true when subcategory was auto-assigned to "General" */
  subcategoryAutoAssigned?: boolean;
}

interface SkippedRow {
  row: number;
  reason: string;
}

interface ParseResult {
  valid: ValidRow[];
  skipped: SkippedRow[];
  total: number;
}

interface ImportResult {
  imported: number;
  updatedExisting?: number;
  skippedDuplicates: number;
  skippedErrors: number;
  errors: string[];
}

interface Props {
  customerId: string;
  onClose: () => void;
  onImported: () => void;
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

/** Parse raw CSV text into validated rows. Pure local logic — no network calls. */
function parseCsv(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { valid: [], skipped: [], total: 0 };

  // Always treat the first line as a header (required for header-name mapping)
  const rawHeaders = lines[0].split(",").map(resolveHeader);
  const dataLines = lines.slice(1);
  const total = dataLines.length;

  const valid: ValidRow[] = [];
  const skipped: SkippedRow[] = [];

  dataLines.forEach((line, idx) => {
    const rowNum = idx + 2; // 1-based, accounting for header row
    const parts = line.split(",").map((p) => p.trim());

    // Build a field map from header names → values
    const fields: Record<string, string> = {};
    rawHeaders.forEach((header, i) => {
      fields[header] = parts[i] ?? "";
    });

    const name = fields["name"] ?? "";
    if (!name) {
      skipped.push({ row: rowNum, reason: "Name is empty" });
      return;
    }
    // Reject names that are numeric or scientific notation (e.g. "6.164E+12").
    // This catches Excel barcode cells that were saved without formatting.
    if (/^[0-9.]+([Ee][+\-][0-9]+)?$/.test(name)) {
      skipped.push({ row: rowNum, reason: `Name looks like a number or barcode ("${name}") — check column order` });
      return;
    }

    const priceStr = fields["price"] ?? "";
    const priceNum = parseFloat(priceStr);
    if (!priceStr || isNaN(priceNum) || priceNum <= 0) {
      skipped.push({ row: rowNum, reason: "Invalid price" });
      return;
    }

    const barcode = fields["barcode"]?.trim() || undefined;
    const costNum = fields["cost_price"] ? parseFloat(fields["cost_price"]) : undefined;
    const stockRaw = fields["stock"];
    const stockNum = stockRaw ? parseInt(stockRaw, 10) : 0;

    // ── Category / subcategory resolution ──────────────────────────────────
    let category: string | undefined;
    let subcategory: string | undefined;
    let subcategoryAutoAssigned = false;

    const rawCategory = fields["category"] ?? "";
    const resolvedCategory = resolveCategory(rawCategory);

    if (!rawCategory.trim()) {
      skipped.push({ row: rowNum, reason: `Category is required for product: "${name}"` });
      return;
    }
    if (!resolvedCategory) {
      skipped.push({ row: rowNum, reason: `Category not found for product: "${name}". CSV value: "${rawCategory.trim()}"` });
      return;
    }

    category = resolvedCategory;
    const rawSubcategory = fields["subcategory"] ?? "";
    const resolvedSub = resolveSubcategory(rawSubcategory, resolvedCategory);
    subcategory = resolvedSub;
    if (!rawSubcategory.trim() || resolvedSub === "General") {
      subcategoryAutoAssigned = rawSubcategory.trim() === "" || resolvedSub === "General";
    }

    valid.push({
      name,
      barcode,
      price: priceNum,
      cost_price: isNaN(costNum as number) ? undefined : costNum,
      stock: isNaN(stockNum) ? 0 : stockNum,
      category,
      subcategory,
      subcategoryAutoAssigned,
    });
  });

  return { valid, skipped, total };
}

// ─── Component ────────────────────────────────────────────────────────────────

export const CsvImportModal = ({ customerId, onClose, onImported }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a .csv file");
      return;
    }
    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setParseResult(parseCsv(text));
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!parseResult || parseResult.valid.length === 0) return;
    setImporting(true);

    try {
      const res = await fetch(`${API_BASE}/api/admin/products/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Customer-ID": customerId,
        },
        body: JSON.stringify({ rows: parseResult.valid }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${res.status}`);
      }

      const result: ImportResult = await res.json();
      setImportResult(result);
      onImported();
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setParseResult(null);
    setFileName("");
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Import Products from CSV</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Format hint */}
          {!parseResult && !importResult && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Expected CSV format (header row required):</p>
              <p className="font-mono break-all">name,barcode,price,cost_price,stock,category,subcategory</p>
              <p>cost_price, stock, category, and subcategory are optional.</p>
              <p>barcode is required for every product.</p>
              <p>Columns can be in any order. Headers are matched by name.</p>
            </div>
          )}

          {/* File picker */}
          {!importResult && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFile}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full gap-2"
              >
                <Upload className="w-4 h-4" />
                {fileName ? fileName : "Choose CSV file"}
              </Button>
            </div>
          )}

          {/* Preview */}
          {parseResult && !importResult && (
            <div className="space-y-3">
              {/* Summary counts */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-secondary p-2">
                  <p className="text-lg font-bold text-foreground">{parseResult.total}</p>
                  <p className="text-[10px] text-muted-foreground">Total rows</p>
                </div>
                <div className="rounded-lg bg-green-500/10 p-2">
                  <p className="text-lg font-bold text-green-600">{parseResult.valid.length}</p>
                  <p className="text-[10px] text-muted-foreground">Valid</p>
                </div>
                <div className="rounded-lg bg-amber-500/10 p-2">
                  <p className="text-lg font-bold text-amber-600">{parseResult.skipped.length}</p>
                  <p className="text-[10px] text-muted-foreground">Skipped</p>
                </div>
              </div>

              {/* Skipped reasons */}
              {parseResult.skipped.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3 space-y-1 max-h-32 overflow-y-auto">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Skipped rows:</p>
                  {parseResult.skipped.map((s) => (
                    <p key={s.row} className="text-[11px] text-amber-600 dark:text-amber-500">
                      Row {s.row}: {s.reason}
                    </p>
                  ))}
                </div>
              )}

              {/* Valid preview (first 5) */}
              {parseResult.valid.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">
                    Preview (first {Math.min(5, parseResult.valid.length)} of {parseResult.valid.length}):
                  </p>
                  <div className="rounded-lg border border-border overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Name</th>
                          <th className="text-right px-2 py-1.5 text-muted-foreground font-medium">Price</th>
                          <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Category</th>
                          <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Subcategory</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.valid.slice(0, 5).map((r, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-2 py-1.5 text-foreground max-w-[120px] truncate">{r.name}</td>
                            <td className="px-2 py-1.5 text-right text-foreground">{r.price.toFixed(2)}</td>
                            <td className="px-2 py-1.5 text-muted-foreground">
                              {r.category ?? <span className="italic text-muted-foreground/60">none</span>}
                            </td>
                            <td className="px-2 py-1.5">
                              {r.subcategory ? (
                                r.subcategoryAutoAssigned ? (
                                  <span className="text-amber-600">{r.subcategory} *</span>
                                ) : (
                                  <span className="text-muted-foreground">{r.subcategory}</span>
                                )
                              ) : (
                                <span className="italic text-muted-foreground/60">none</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parseResult.valid.some((r) => r.subcategoryAutoAssigned) && (
                    <p className="text-[10px] text-amber-600">* Subcategory auto-assigned to "General"</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <p className="text-lg font-bold text-green-600">{importResult.imported}</p>
                  <p className="text-[10px] text-muted-foreground">Imported</p>
                </div>
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <p className="text-lg font-bold text-blue-600">{importResult.updatedExisting ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground">Updated</p>
                </div>
                <div className="rounded-lg bg-secondary p-2">
                  <p className="text-lg font-bold text-foreground">{importResult.skippedDuplicates}</p>
                  <p className="text-[10px] text-muted-foreground">Skipped</p>
                </div>
                <div className="rounded-lg bg-red-500/10 p-2">
                  <p className="text-lg font-bold text-red-500">{importResult.skippedErrors}</p>
                  <p className="text-[10px] text-muted-foreground">Errors</p>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 p-3 space-y-1">
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-[11px] text-red-600">{e}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex gap-2 p-4 border-t border-border">
          {!importResult ? (
            <>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              {parseResult && parseResult.valid.length > 0 && (
                <Button
                  type="button"
                  onClick={handleImport}
                  disabled={importing}
                  className="flex-1 bg-primary hover:bg-primary/90 gap-2"
                >
                  {importing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Importing…
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Import {parseResult.valid.length} Products
                    </>
                  )}
                </Button>
              )}
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={reset} className="flex-1">
                Import Another
              </Button>
              <Button type="button" onClick={onClose} className="flex-1 bg-primary hover:bg-primary/90">
                Done
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
