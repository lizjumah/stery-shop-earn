import { useRef, useState } from "react";
import { X, Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_BASE } from "@/lib/api/client";
import { toast } from "sonner";

interface CsvRow {
  name: string;
  barcode: string;
  price: string;
  cost_price: string;
  stock: string;
}

interface ValidRow {
  name: string;
  barcode?: string;
  price: number;
  cost_price?: number;
  stock: number;
}

interface SkippedRow {
  row: number;
  reason: string;
  raw: string;
}

interface ParseResult {
  valid: ValidRow[];
  skipped: SkippedRow[];
  total: number;
}

interface ImportResult {
  imported: number;
  skippedDuplicates: number;
  skippedErrors: number;
  errors: string[];
}

interface Props {
  customerId: string;
  onClose: () => void;
  onImported: () => void;
}

/** Parse raw CSV text into validated rows. No network calls — pure local logic. */
function parseCsv(text: string): ParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return { valid: [], skipped: [], total: 0 };

  // Detect and skip header row
  const firstLower = lines[0].toLowerCase();
  const hasHeader =
    firstLower.includes("name") || firstLower.includes("price") || firstLower.includes("barcode");
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const total = dataLines.length;

  const valid: ValidRow[] = [];
  const skipped: SkippedRow[] = [];

  dataLines.forEach((line, idx) => {
    const rowNum = idx + (hasHeader ? 2 : 1); // 1-based for user display
    const parts = line.split(",").map((p) => p.trim());
    const [name = "", barcode = "", price = "", cost_price = "", stock = ""] = parts as [
      string, string, string, string, string
    ];

    if (!name) {
      skipped.push({ row: rowNum, reason: "Name is empty", raw: line });
      return;
    }

    const priceNum = parseFloat(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      skipped.push({ row: rowNum, reason: "Invalid price", raw: line });
      return;
    }

    const costNum = cost_price ? parseFloat(cost_price) : undefined;
    const stockNum = stock ? parseInt(stock, 10) : 0;

    valid.push({
      name,
      barcode: barcode || undefined,
      price: priceNum,
      cost_price: costNum,
      stock: isNaN(stockNum) ? 0 : stockNum,
    });
  });

  return { valid, skipped, total };
}

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
      onImported(); // refresh product list in parent
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
      <div className="bg-card rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-border shadow-xl">
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
            <div className="rounded-lg bg-secondary p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Expected CSV format:</p>
              <p className="font-mono">name,barcode,price,cost_price,stock</p>
              <p>barcode, cost_price, and stock are optional. Header row is auto-detected.</p>
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
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                    Skipped rows:
                  </p>
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
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-secondary">
                        <tr>
                          <th className="text-left px-2 py-1.5 text-muted-foreground font-medium">Name</th>
                          <th className="text-right px-2 py-1.5 text-muted-foreground font-medium">Price</th>
                          <th className="text-right px-2 py-1.5 text-muted-foreground font-medium">Stock</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseResult.valid.slice(0, 5).map((r, i) => (
                          <tr key={i} className="border-t border-border">
                            <td className="px-2 py-1.5 text-foreground truncate max-w-[160px]">{r.name}</td>
                            <td className="px-2 py-1.5 text-right text-foreground">
                              {r.price.toFixed(2)}
                            </td>
                            <td className="px-2 py-1.5 text-right text-muted-foreground">{r.stock}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <p className="text-lg font-bold text-green-600">{importResult.imported}</p>
                  <p className="text-[10px] text-muted-foreground">Imported</p>
                </div>
                <div className="rounded-lg bg-secondary p-2">
                  <p className="text-lg font-bold text-foreground">{importResult.skippedDuplicates}</p>
                  <p className="text-[10px] text-muted-foreground">Duplicates</p>
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
