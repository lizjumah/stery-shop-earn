import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
  History,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { API_BASE, getAdminHeaders } from "@/lib/api/client";

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = "idle" | "previewing" | "preview" | "applying" | "applied";

interface Summary {
  total_rows: number;
  matched_rows: number;
  unmatched_rows: number;
  invalid_rows: number;
  price_changes: number;
  unchanged_rows: number;
}

interface PreviewItem {
  barcode: string;
  pos_description: string;
  pos_stock: number | null;
  pos_price: number | null;
  pos_category: string | null;
  product_name: string | null;
  current_stock: number | null;
  current_price: number | null;
  status: string;
  invalid_reason: string | null;
  row_number: number;
}

interface UploadRecord {
  id: string;
  file_name: string;
  uploaded_by: string | null;
  total_rows: number;
  matched_rows: number;
  unmatched_rows: number;
  invalid_rows: number;
  updated_rows: number;
  status: string;
  applied_at: string | null;
  created_at: string;
}

const PAGE_SIZE = 50;

// ── Component ─────────────────────────────────────────────────────────────────

export default function POSStockUpload() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [appliedCount, setAppliedCount] = useState(0);
  const [appliedPriceCount, setAppliedPriceCount] = useState(0);

  const [matchedItems, setMatchedItems] = useState<PreviewItem[]>([]);
  const [matchedTotal, setMatchedTotal] = useState(0);
  const [matchedPage, setMatchedPage] = useState(1);

  const [unmatchedItems, setUnmatchedItems] = useState<PreviewItem[]>([]);
  const [unmatchedTotal, setUnmatchedTotal] = useState(0);
  const [unmatchedPage, setUnmatchedPage] = useState(1);

  const [tableLoading, setTableLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // ── Preview ───────────────────────────────────────────────────────────────

  async function handlePreview() {
    if (!file) return toast.error("Please select a file");
    setPhase("previewing");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const headers = getAdminHeaders();
      const res = await fetch(`${API_BASE}/api/admin/inventory/pos-upload/preview`, {
        method: "POST",
        headers: { "X-Customer-ID": headers["X-Customer-ID"] },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Preview failed");

      setUploadId(json.upload_id);
      setSummary(json.summary);
      setMatchedItems(json.matched_preview ?? []);
      setMatchedTotal(json.summary.matched_rows);
      setMatchedPage(1);
      setUnmatchedItems(json.unmatched_preview ?? []);
      setUnmatchedTotal(json.summary.unmatched_rows);
      setUnmatchedPage(1);
      setPhase("preview");
    } catch (err: any) {
      toast.error(err.message || "Preview failed");
      setPhase("idle");
    }
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  async function fetchMatchedPage(page: number) {
    if (!uploadId) return;
    setTableLoading(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const headers = getAdminHeaders();
      const res = await fetch(
        `${API_BASE}/api/admin/inventory/pos-upload/preview/${uploadId}?status=matched&offset=${offset}&limit=${PAGE_SIZE}`,
        { headers }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setMatchedItems(json.items ?? []);
      setMatchedPage(page);
    } catch (err: any) {
      toast.error("Failed to load page: " + err.message);
    } finally {
      setTableLoading(false);
    }
  }

  async function fetchUnmatchedPage(page: number) {
    if (!uploadId) return;
    setTableLoading(true);
    try {
      const offset = (page - 1) * PAGE_SIZE;
      const headers = getAdminHeaders();
      const res = await fetch(
        `${API_BASE}/api/admin/inventory/pos-upload/preview/${uploadId}?status=unmatched&offset=${offset}&limit=${PAGE_SIZE}`,
        { headers }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setUnmatchedItems(json.items ?? []);
      setUnmatchedPage(page);
    } catch (err: any) {
      toast.error("Failed to load page: " + err.message);
    } finally {
      setTableLoading(false);
    }
  }

  // ── Apply ─────────────────────────────────────────────────────────────────

  async function handleApply() {
    if (!uploadId || !summary || summary.matched_rows === 0) return;
    setPhase("applying");
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/inventory/pos-upload/${uploadId}/apply`,
        { method: "POST", headers: getAdminHeaders() }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Apply failed");

      setAppliedCount(json.updated);
      setAppliedPriceCount(json.price_updated ?? 0);
      setPhase("applied");
      setHistoryLoaded(false);
      toast.success(`Stock updated for ${json.updated} products`);
    } catch (err: any) {
      toast.error(err.message || "Apply failed");
      setPhase("preview");
    }
  }

  // ── Download unmatched CSV ────────────────────────────────────────────────

  async function handleDownloadUnmatched() {
    if (!uploadId) return;
    try {
      const headers = getAdminHeaders();
      const res = await fetch(
        `${API_BASE}/api/admin/inventory/pos-upload/unmatched/${uploadId}`,
        { headers: { "X-Customer-ID": headers["X-Customer-ID"] } }
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pos_unmatched_${uploadId.slice(0, 8)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error("Download failed: " + err.message);
    }
  }

  // ── History ───────────────────────────────────────────────────────────────

  async function loadHistory() {
    if (historyLoaded) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/inventory/pos-upload/history`, {
        headers: getAdminHeaders(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setHistory(json.uploads ?? []);
      setHistoryLoaded(true);
    } catch (err: any) {
      toast.error("History: " + err.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  // ── Reset ─────────────────────────────────────────────────────────────────

  function resetForm() {
    setPhase("idle");
    setUploadId(null);
    setSummary(null);
    setFile(null);
    setMatchedItems([]);
    setMatchedTotal(0);
    setUnmatchedItems([]);
    setUnmatchedTotal(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">

      <div>
        <h1 className="text-xl font-semibold">POS Stock Upload</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload the raw stock export file from your POS system. Barcodes are
          matched exactly — stock quantities are updated, nothing else.
        </p>
      </div>

      {/* ── Upload Form ── */}
      {(phase === "idle" || phase === "previewing") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Upload POS Export File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-xs text-muted-foreground bg-muted rounded-md p-3 space-y-1">
              <p className="font-medium text-foreground">
                Supported formats: <code className="bg-background px-1 rounded">.xlsx</code>{" "}
                <code className="bg-background px-1 rounded">.xls</code>{" "}
                <code className="bg-background px-1 rounded">.csv</code>
              </p>
              <p>
                The parser looks for a row containing{" "}
                <code className="bg-background px-1 rounded">item_number</code> and reads{" "}
                <code className="bg-background px-1 rounded">Description</code> +{" "}
                <code className="bg-background px-1 rounded">On Hand</code> from each product row.
              </p>
              <p className="text-amber-600 font-medium">
                Only <code className="bg-background px-1 rounded">stock_quantity</code> is updated —
                names, prices, and categories are never changed.
              </p>
            </div>

            <div className="space-y-1.5 max-w-sm">
              <label htmlFor="pos-file" className="text-sm font-medium">
                POS Export File
              </label>
              <input
                id="pos-file"
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                disabled={phase === "previewing"}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <Button
              onClick={handlePreview}
              disabled={!file || phase === "previewing"}
              className="w-full sm:w-auto"
            >
              {phase === "previewing" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Parsing file…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Preview
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Preview + Apply ── */}
      {(phase === "preview" || phase === "applying") && summary && (
        <>
          {/* Summary tiles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">File Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <SummaryTile label="Total Rows" value={summary.total_rows} />
                <SummaryTile label="Stock Updates" value={summary.matched_rows} color={summary.matched_rows > 0 ? "green" : undefined} />
                <SummaryTile label="Price Changes" value={summary.price_changes ?? 0} color={(summary.price_changes ?? 0) > 0 ? "amber" : undefined} />
                <SummaryTile label="Unchanged" value={summary.unchanged_rows ?? 0} />
                <SummaryTile label="Unmatched" value={summary.unmatched_rows} color={summary.unmatched_rows > 0 ? "amber" : undefined} />
                <SummaryTile label="Invalid" value={summary.invalid_rows} color={summary.invalid_rows > 0 ? "red" : undefined} />
              </div>
            </CardContent>
          </Card>

          {/* Matched rows table */}
          {summary.matched_rows > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Matched — {summary.matched_rows} stock updates, {summary.price_changes ?? 0} price changes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <MatchedTable
                  items={matchedItems}
                  loading={tableLoading}
                  total={matchedTotal}
                  page={matchedPage}
                  onPage={fetchMatchedPage}
                />
              </CardContent>
            </Card>
          )}

          {/* Unmatched rows table */}
          {summary.unmatched_rows > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Unmatched Barcodes — {summary.unmatched_rows} skipped (no product found)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <UnmatchedTable
                  items={unmatchedItems}
                  loading={tableLoading}
                  total={unmatchedTotal}
                  page={unmatchedPage}
                  onPage={fetchUnmatchedPage}
                />
              </CardContent>
            </Card>
          )}

          {summary.matched_rows === 0 && (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-amber-700 flex items-center gap-2">
                  <XCircle className="h-4 w-4 shrink-0" />
                  No barcodes matched. Check that products in Stery have barcodes set, or
                  download the unmatched list below.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3 items-center">
            {summary.matched_rows > 0 && (
              <Button
                onClick={handleApply}
                disabled={phase === "applying"}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {phase === "applying" ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Applying…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Apply {summary.matched_rows} Stock Update{summary.matched_rows !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            )}
            {summary.unmatched_rows > 0 && (
              <Button
                variant="outline"
                onClick={handleDownloadUnmatched}
                disabled={phase === "applying"}
              >
                <Download className="h-4 w-4 mr-2" />
                Download Unmatched ({summary.unmatched_rows})
              </Button>
            )}
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={phase === "applying"}
            >
              Upload Another File
            </Button>
          </div>
          </div>
        </>
      )}

      {/* ── Applied ── */}
      {phase === "applied" && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <div>
              <p className="text-lg font-semibold text-green-800">Upload Applied</p>
              <p className="text-sm text-green-700 mt-1">
                {appliedCount} stock update{appliedCount !== 1 ? "s" : ""} applied.
              </p>
              {appliedPriceCount > 0 && (
                <p className="text-sm text-green-700">
                  {appliedPriceCount} price update{appliedPriceCount !== 1 ? "s" : ""} applied.
                </p>
              )}
            </div>
            <div className="flex justify-center gap-3 pt-1">
              {uploadId && (
                <Button variant="outline" onClick={handleDownloadUnmatched}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Unmatched
                </Button>
              )}
              <Button variant="outline" onClick={resetForm}>
                Upload Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Upload History ── */}
      <div>
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          onClick={loadHistory}
        >
          <History className="h-4 w-4" />
          {historyLoaded ? "Recent POS Uploads" : "Show recent uploads"}
          {historyLoading && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
        </button>

        {historyLoaded && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Matched</TableHead>
                      <TableHead className="text-right">Unmatched</TableHead>
                      <TableHead className="text-right">Updated</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Uploaded</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-muted-foreground text-sm">
                          No POS uploads yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      history.map((rec) => (
                        <TableRow key={rec.id}>
                          <TableCell className="text-sm font-mono max-w-[200px] truncate">
                            {rec.file_name}
                          </TableCell>
                          <TableCell className="text-right text-sm">{rec.total_rows}</TableCell>
                          <TableCell className="text-right text-sm text-green-700">{rec.matched_rows}</TableCell>
                          <TableCell className="text-right text-sm text-amber-600">{rec.unmatched_rows}</TableCell>
                          <TableCell className="text-right text-sm">{rec.updated_rows}</TableCell>
                          <TableCell>
                            <Badge
                              variant={rec.status === "applied" ? "default" : "secondary"}
                              className={
                                rec.status === "applied"
                                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                                  : ""
                              }
                            >
                              {rec.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(rec.created_at).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryTile({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: "green" | "amber" | "red";
}) {
  const colorClass =
    color === "green"
      ? "text-green-600"
      : color === "amber"
      ? "text-amber-600"
      : color === "red"
      ? "text-destructive"
      : "text-foreground";

  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${colorClass}`}>{value}</p>
    </div>
  );
}

function MatchedTable({
  items,
  loading,
  total,
  page,
  onPage,
}: {
  items: PreviewItem[];
  loading: boolean;
  total: number;
  page: number;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function largePriceChange(item: PreviewItem): boolean {
    if (item.pos_price == null || item.current_price == null || item.current_price === 0) return false;
    return Math.abs(Number(item.pos_price) - Number(item.current_price)) / Number(item.current_price) > 0.4;
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Row</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>POS Description</TableHead>
              <TableHead className="text-right">POS Stock</TableHead>
              <TableHead className="text-right">Curr. Stock</TableHead>
              <TableHead className="text-right">POS Price</TableHead>
              <TableHead className="text-right">Curr. Price</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-sm">
                  No rows
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-muted-foreground text-xs">{item.row_number}</TableCell>
                  <TableCell className="font-mono text-xs">{item.barcode}</TableCell>
                  <TableCell className="text-sm">{item.pos_description}</TableCell>
                  <TableCell className="text-right font-semibold text-sm">{item.pos_stock ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">{item.current_stock ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {item.pos_price != null ? `KSh ${Number(item.pos_price).toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {item.current_price != null ? `KSh ${Number(item.current_price).toLocaleString()}` : "—"}
                  </TableCell>
                  <TableCell>
                    {largePriceChange(item) && (
                      <span className="text-xs text-amber-600 font-medium whitespace-nowrap">⚠ Large price change</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {total} rows total
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1 || loading}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPage(page + 1)} disabled={page >= totalPages || loading}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function UnmatchedTable({
  items,
  loading,
  total,
  page,
  onPage,
}: {
  items: PreviewItem[];
  loading: boolean;
  total: number;
  page: number;
  onPage: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Row</TableHead>
              <TableHead>Barcode</TableHead>
              <TableHead>POS Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">POS Stock</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-sm">
                  No rows
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-muted-foreground text-xs">{item.row_number}</TableCell>
                  <TableCell className="font-mono text-xs">{item.barcode || "—"}</TableCell>
                  <TableCell className="text-sm">{item.pos_description || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.pos_category ?? "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {item.pos_stock ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {item.status === "invalid"
                      ? item.invalid_reason ?? "Invalid row"
                      : "No matching barcode in Stery"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} · {total} rows total
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1 || loading}>
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => onPage(page + 1)} disabled={page >= totalPages || loading}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
