import { useState, useEffect, useCallback } from "react";
import { ShopHeader } from "@/components/ShopHeader";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { API_BASE } from "@/lib/api/client";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  actor_user_id: string | null;
  actor_name: string | null;
  source: string;
  reason: string | null;
  before_data: Record<string, any> | null;
  after_data: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

// ── Display helpers ────────────────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  product_created: "Product Created",
  product_updated: "Product Updated",
  UPDATE_ORDER_STATUS: "Order Status Changed",
  UPDATE_PAYMENT_STATUS: "Payment Status Changed",
  INVENTORY_UPLOAD_ANALYZE: "Upload Analysed",
  INVENTORY_UPLOAD_APPLY: "Upload Applied",
  CSV_IMPORT: "Bulk Import",
  CREATE_STOCK_ALERT: "Alert Created",
  RESOLVE_STOCK_ALERT: "Alert Resolved",
};

const ENTITY_TYPE_OPTIONS = [
  { value: "", label: "All entity types" },
  { value: "product", label: "Product" },
  { value: "order", label: "Order" },
  { value: "inventory_upload", label: "Inventory Upload" },
  { value: "stock_alert", label: "Stock Alert" },
];

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "product_created", label: "Product Created" },
  { value: "product_updated", label: "Product Updated" },
  { value: "UPDATE_ORDER_STATUS", label: "Order Status Changed" },
  { value: "UPDATE_PAYMENT_STATUS", label: "Payment Status Changed" },
  { value: "INVENTORY_UPLOAD_ANALYZE", label: "Upload Analysed" },
  { value: "INVENTORY_UPLOAD_APPLY", label: "Upload Applied" },
  { value: "CSV_IMPORT", label: "Bulk Import" },
  { value: "CREATE_STOCK_ALERT", label: "Alert Created" },
  { value: "RESOLVE_STOCK_ALERT", label: "Alert Resolved" },
];

function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function summarize(log: AuditLog): string {
  const a = log.after_data;
  const b = log.before_data;
  switch (log.action) {
    case "product_created":
      return `Created "${a?.name ?? log.entity_id ?? "—"}"`;
    case "product_updated":
      return `Updated "${a?.name ?? b?.name ?? log.entity_id ?? "—"}"`;
    case "UPDATE_ORDER_STATUS":
      return `${b?.status ?? "?"} → ${a?.status ?? "?"}`;
    case "UPDATE_PAYMENT_STATUS":
      return `Payment → ${a?.payment_status ?? "?"}`;
    case "INVENTORY_UPLOAD_APPLY":
      return `Applied: ${a?.updated ?? 0} products updated`;
    case "INVENTORY_UPLOAD_ANALYZE":
      return `Analysed: ${a?.total_rows ?? 0} rows, ${a?.changed_rows ?? 0} changes${a?.file_name ? ` (${a.file_name})` : ""}`;
    case "CSV_IMPORT":
      return `Bulk import: ${a?.imported ?? 0} added, ${a?.skippedDuplicates ?? 0} dupes skipped`;
    case "CREATE_STOCK_ALERT":
      return "Stock alert created";
    case "RESOLVE_STOCK_ALERT":
      return "Stock alert resolved";
    default:
      return log.action;
  }
}

function entityDisplay(log: AuditLog): string {
  const a = log.after_data;
  if (a?.name) return a.name;
  if (a?.file_name) return a.file_name;
  if (log.entity_id) {
    return log.entity_id.length > 18
      ? log.entity_id.substring(0, 8) + "…"
      : log.entity_id;
  }
  return "—";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const SOURCE_BADGE: Record<string, string> = {
  backend_api: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  admin_ui: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  csv_import: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  inventory_upload: "bg-teal-500/10 text-teal-700 border-teal-500/20",
};

// ── Component ─────────────────────────────────────────────────────────────────

const AuditTrail = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState(""); // uncontrolled until Enter/button

  const PAGE_SIZE = 50;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const customerId = localStorage.getItem("stery_customer_id") || "";

  const fetchLogs = useCallback(
    async (overridePage?: number) => {
      setLoading(true);
      try {
        const p = overridePage ?? page;
        const params = new URLSearchParams({ page: String(p) });
        if (entityType) params.set("entity_type", entityType);
        if (action) params.set("action", action);
        if (fromDate) params.set("from_date", fromDate);
        if (toDate) params.set("to_date", toDate);
        if (search.trim()) params.set("search", search.trim());

        const res = await fetch(`${API_BASE}/api/admin/audit?${params}`, {
          headers: { "X-Customer-ID": customerId },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setLogs(json.logs ?? []);
        setTotal(json.total ?? 0);
      } catch (err: any) {
        console.error("Audit trail fetch error:", err);
      } finally {
        setLoading(false);
      }
    },
    [page, entityType, action, fromDate, toDate, search, customerId]
  );

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const applySearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setEntityType("");
    setAction("");
    setFromDate("");
    setToDate("");
    setSearch("");
    setSearchInput("");
    setPage(1);
  };

  const hasFilters = entityType || action || fromDate || toDate || search;

  return (
    <div className="min-h-screen bg-background pb-8">
      <ShopHeader title="Admin — Audit Trail" showBack />

      {/* Filters */}
      <div className="px-4 pt-4 pb-3 space-y-3">
        {/* Search row */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search entity ID or user name…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applySearch()}
            className="flex-1 h-9 px-3 text-sm rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button size="sm" variant="outline" onClick={applySearch} className="shrink-0">
            Search
          </Button>
          <button
            onClick={() => fetchLogs()}
            disabled={loading}
            className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors shrink-0"
          >
            <RefreshCw
              className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`}
            />
          </button>
        </div>

        {/* Filter selects + date range */}
        <div className="flex flex-wrap gap-2">
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
            className="h-9 px-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {ENTITY_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="h-9 px-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {ACTION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
            className="h-9 px-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <span className="self-center text-muted-foreground text-xs">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => { setToDate(e.target.value); setPage(1); }}
            className="h-9 px-2 text-sm rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {hasFilters && (
            <Button size="sm" variant="ghost" onClick={clearFilters} className="text-xs text-muted-foreground">
              Clear filters
            </Button>
          )}
        </div>
      </div>

      {/* Result count */}
      <div className="px-4 pb-2 text-xs text-muted-foreground">
        {loading ? "Loading…" : `${total.toLocaleString()} entries · Page ${page} of ${totalPages}`}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No audit log entries found.
        </div>
      ) : (
        <div className="px-4 overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm border-collapse">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                <th className="text-left py-2 pr-4 font-medium w-36">Date / Time</th>
                <th className="text-left py-2 pr-4 font-medium w-28">User</th>
                <th className="text-left py-2 pr-4 font-medium w-40">Action</th>
                <th className="text-left py-2 pr-4 font-medium w-28">Entity Type</th>
                <th className="text-left py-2 pr-4 font-medium w-32">Entity</th>
                <th className="text-left py-2 pr-4 font-medium">Summary</th>
                <th className="text-left py-2 font-medium w-24">Source</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr
                  key={log.id}
                  className={`border-b border-border/50 hover:bg-secondary/40 transition-colors ${
                    i % 2 === 0 ? "" : "bg-secondary/10"
                  }`}
                >
                  <td className="py-2 pr-4 text-muted-foreground whitespace-nowrap text-xs">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="py-2 pr-4 font-medium text-foreground truncate max-w-[7rem]" title={log.actor_name ?? log.actor_user_id ?? "—"}>
                    {log.actor_name ?? (log.actor_user_id ? log.actor_user_id.substring(0, 8) + "…" : "—")}
                  </td>
                  <td className="py-2 pr-4 text-foreground">
                    {actionLabel(log.action)}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground capitalize">
                    {log.entity_type.replace(/_/g, " ")}
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground font-mono text-xs truncate max-w-[8rem]" title={log.entity_id ?? ""}>
                    {entityDisplay(log)}
                  </td>
                  <td className="py-2 pr-4 text-foreground">
                    {summarize(log)}
                  </td>
                  <td className="py-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                        SOURCE_BADGE[log.source] ?? "bg-secondary text-muted-foreground border-border"
                      }`}
                    >
                      {log.source.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="px-4 pt-4 flex items-center gap-3 justify-end">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="gap-1"
          >
            <ChevronLeft className="w-3 h-3" /> Prev
          </Button>
          <span className="text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="gap-1"
          >
            Next <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default AuditTrail;
