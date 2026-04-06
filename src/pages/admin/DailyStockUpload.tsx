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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

type Phase = "idle" | "analyzing" | "preview" | "applying" | "applied";

interface Summary {
  total_rows: number;
  matched_rows: number;
  changed_rows: number;
  unchanged_rows: number;
  unmatched_rows: number;
  invalid_rows: number;
  duplicate_barcodes: number;
}

interface UploadItem {
  id: string;
  barcode: string;
  product_name: string | null;
  stock_in_file: number;
  stock_in_db: number | null;
  status: string;
  row_number: number;
}

interface TableState {
  items: UploadItem[];
  total: number;
  page: number;
  loading: boolean;
}

interface UploadRecord {
  id: string;
  file_name: string;
  stock_date: string;
  status: string;
  total_rows: number;
  changed_rows: number;
  applied_at: string | null;
  created_at: string;
}

const PAGE_SIZE = 20;

// ── Component ─────────────────────────────────────────────────────────────────

export default function DailyStockUpload() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [appliedCount, setAppliedCount] = useState(0);

  const [changedTable, setChangedTable] = useState<TableState>({
    items: [],
    total: 0,
    page: 1,
    loading: false,
  });
  const [unmatchedTable, setUnmatchedTable] = useState<TableState>({
    items: [],
    total: 0,
    page: 1,
    loading: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stockDate, setStockDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // ── Analyze ──────────────────────────────────────────────────────────────

  async function handleAnalyze() {
    if (!file) return toast.error("Please select a CSV file");
    if (!stockDate) return toast.error("Please enter a stock date");

    setPhase("analyzing");
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("stock_date", stockDate);
      if (notes) formData.append("notes", notes);

      // Use X-Customer-ID header only — let browser set multipart boundary
      const headers = getAdminHeaders();
      const res = await fetch(`${API_BASE}/api/admin/inventory/analyze`, {
        method: "POST",
        headers: { "X-Customer-ID": headers["X-Customer-ID"] },
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Analysis failed");

      setUploadId(json.upload_id);
      setSummary(json.summary);
      setChangedTable({
        items: json.changed_preview ?? [],
        total: json.summary.changed_rows,
        page: 1,
        loading: false,
      });
      setUnmatchedTable({
        items: json.unmatched_preview ?? [],
        total: json.summary.unmatched_rows,
        page: 1,
        loading: false,
      });
      setPhase("preview");
    } catch (err: any) {
      toast.error(err.message || "Analysis failed");
      setPhase("idle");
    }
  }

  // ── Pagination ────────────────────────────────────────────────────────────

  async function fetchPage(
    tableType: "changed" | "unmatched",
    page: number
  ) {
    if (!uploadId) return;

    const setter =
      tableType === "changed" ? setChangedTable : setUnmatchedTable;
    setter((prev) => ({ ...prev, loading: true }));

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/inventory/uploads/${uploadId}/preview?status=${tableType}&page=${page}`,
        { headers: getAdminHeaders() }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setter({ items: json.items, total: json.total, page, loading: false });
    } catch (err: any) {
      toast.error(`Failed to load page: ${err.message}`);
      setter((prev) => ({ ...prev, loading: false }));
    }
  }

  // ── Apply ─────────────────────────────────────────────────────────────────

  async function handleApply() {
    if (!uploadId || !summary || summary.changed_rows === 0) return;

    setPhase("applying");
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/inventory/uploads/${uploadId}/apply`,
        { method: "POST", headers: getAdminHeaders() }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Apply failed");

      setAppliedCount(json.updated);
      setPhase("applied");
      setHistoryLoaded(false); // invalidate history cache
      toast.success(`Stock updated for ${json.updated} products`);
    } catch (err: any) {
      toast.error(err.message || "Apply failed");
      setPhase("preview");
    }
  }

  // ── History ───────────────────────────────────────────────────────────────

  async function loadHistory() {
    if (historyLoaded) return;
    setHistoryLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/admin/inventory/history`,
        { headers: getAdminHeaders() }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setHistory(json.uploads ?? []);
      setHistoryLoaded(true);
    } catch (err: any) {
      toast.error(`History: ${err.message}`);
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
    setNotes("");
    setChangedTable({ items: [], total: 0, page: 1, loading: false });
    setUnmatchedTable({ items: [], total: 0, page: 1, loading: false });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Daily Stock Upload</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload the POS closing or opening stock CSV. Changes are previewed
          before anything is applied.
        </p>
      </div>

      {/* ── Upload Form ── */}
      {(phase === "idle" || phase === "analyzing") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Upload CSV File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Format guide */}
            <div className="text-xs text-muted-foreground bg-muted rounded-md p-3 space-y-1">
              <p className="font-medium text-foreground">
                Required columns:{" "}
                <code className="bg-background px-1 rounded">barcode</code>,{" "}
                <code className="bg-background px-1 rounded">stock</code>
              </p>
              <p>
                Optional:{" "}
                <code className="bg-background px-1 rounded">product_name</code>{" "}
                <code className="bg-background px-1 rounded">cost_price</code>{" "}
                <code className="bg-background px-1 rounded">selling_price</code>{" "}
                <code className="bg-background px-1 rounded">category</code>{" "}
                <code className="bg-background px-1 rounded">subcategory</code>
              </p>
              <p className="text-amber-600 font-medium">
                Only stock quantities are updated — prices and categories are
                never changed during a stock upload.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="csv-file">CSV File *</Label>
                <Input
                  id="csv-file"
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  disabled={phase === "analyzing"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock-date">Stock Date *</Label>
                <Input
                  id="stock-date"
                  type="date"
                  value={stockDate}
                  onChange={(e) => setStockDate(e.target.value)}
                  disabled={phase === "analyzing"}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="e.g. End-of-day closing stock — 19 Mar 2026"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={phase === "analyzing"}
                rows={2}
              />
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={!file || !stockDate || phase === "analyzing"}
              className="w-full sm:w-auto"
            >
              {phase === "analyzing" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Analyze
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Preview Phase ── */}
      {(phase === "preview" || phase === "applying") && summary && (
        <>
          {/* Summary tiles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Analysis Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryTile label="Total Rows" value={summary.total_rows} />
                <SummaryTile
                  label="Matched"
                  value={summary.matched_rows}
                  color="green"
                />
                <SummaryTile
                  label="Will Change"
                  value={summary.changed_rows}
                  color={summary.changed_rows > 0 ? "amber" : undefined}
                />
                <SummaryTile
                  label="Unchanged"
                  value={summary.unchanged_rows}
                />
                <SummaryTile
                  label="Unmatched"
                  value={summary.unmatched_rows}
                  color={summary.unmatched_rows > 0 ? "red" : undefined}
                />
                <SummaryTile
                  label="Invalid"
                  value={summary.invalid_rows}
                  color={summary.invalid_rows > 0 ? "red" : undefined}
                />
                <SummaryTile
                  label="Dup. Barcodes"
                  value={summary.duplicate_barcodes}
                  color={summary.duplicate_barcodes > 0 ? "amber" : undefined}
                />
              </div>
            </CardContent>
          </Card>

          {/* Changed rows table */}
          {summary.changed_rows > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Stock Changes — {summary.changed_rows} product
                  {summary.changed_rows !== 1 ? "s" : ""} will be updated
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <PreviewTable
                  items={changedTable.items}
                  loading={changedTable.loading}
                  total={changedTable.total}
                  page={changedTable.page}
                  onPage={(p) => fetchPage("changed", p)}
                  showDiff
                />
              </CardContent>
            </Card>
          )}

          {/* Unmatched rows table */}
          {summary.unmatched_rows > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-destructive" />
                  Unmatched Barcodes — {summary.unmatched_rows} row
                  {summary.unmatched_rows !== 1 ? "s" : ""} will be skipped
                  (no product found)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <PreviewTable
                  items={unmatchedTable.items}
                  loading={unmatchedTable.loading}
                  total={unmatchedTable.total}
                  page={unmatchedTable.page}
                  onPage={(p) => fetchPage("unmatched", p)}
                />
              </CardContent>
            </Card>
          )}

          {/* Nothing to apply */}
          {summary.changed_rows === 0 && (
            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CardContent className="pt-4 pb-4">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  All matched products already have the same stock values.
                  Nothing to apply.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-3 items-center">
            {summary.changed_rows > 0 && (
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
                    Confirm & Apply {summary.changed_rows} Change
                    {summary.changed_rows !== 1 ? "s" : ""}
                  </>
                )}
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
        </>
      )}

      {/* ── Applied ── */}
      {phase === "applied" && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-8 pb-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" />
            <div>
              <p className="text-lg font-semibold text-green-800">
                Stock Updated
              </p>
              <p className="text-sm text-green-700 mt-1">
                {appliedCount} product{appliedCount !== 1 ? "s" : ""} updated
                successfully.
              </p>
            </div>
            <Button onClick={resetForm} variant="outline" className="mt-2">
              Upload Another File
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Upload History ── */}
      <div>
        <button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
          onClick={() => {
            loadHistory();
          }}
        >
          <History className="h-4 w-4" />
          {historyLoaded ? "Recent Uploads" : "Show recent uploads"}
          {historyLoading && (
            <Loader2 className="h-3 w-3 animate-spin ml-1" />
          )}
        </button>

        {historyLoaded && (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Stock Date</TableHead>
                    <TableHead className="text-right">Rows</TableHead>
                    <TableHead className="text-right">Changes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-6 text-muted-foreground text-sm"
                      >
                        No uploads yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((rec) => (
                      <TableRow key={rec.id}>
                        <TableCell className="text-sm font-mono max-w-[180px] truncate">
                          {rec.file_name}
                        </TableCell>
                        <TableCell className="text-sm">
                          {rec.stock_date}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {rec.total_rows}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {rec.changed_rows}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              rec.status === "applied"
                                ? "default"
                                : "secondary"
                            }
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

function PreviewTable({
  items,
  loading,
  total,
  page,
  onPage,
  showDiff = false,
}: {
  items: UploadItem[];
  loading: boolean;
  total: number;
  page: number;
  onPage: (page: number) => void;
  showDiff?: boolean;
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
              <TableHead>Product</TableHead>
              <TableHead className="text-right">File Stock</TableHead>
              {showDiff && (
                <TableHead className="text-right">Current Stock</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={showDiff ? 5 : 4}
                  className="text-center py-8"
                >
                  <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={showDiff ? 5 : 4}
                  className="text-center py-6 text-muted-foreground text-sm"
                >
                  No rows on this page
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-muted-foreground text-xs">
                    {item.row_number}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.barcode}
                  </TableCell>
                  <TableCell className="text-sm">
                    {item.product_name ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {item.stock_in_file}
                  </TableCell>
                  {showDiff && (
                    <TableCell className="text-right text-muted-foreground">
                      {item.stock_in_db ?? "—"}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} &nbsp;·&nbsp; {total} rows total
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPage(page - 1)}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPage(page + 1)}
              disabled={page >= totalPages || loading}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
