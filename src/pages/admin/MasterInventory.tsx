import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import {
  Search,
  X,
  Download,
  Printer,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InvSubNav } from "@/components/InvSubNav";
import { API_BASE, getAdminHeaders } from "@/lib/api/client";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  barcode: string | null;
  category: string | null;
  subcategory: string | null;
  cost_price: number | null;
  price: number;
  stock_quantity: number | null;
  stock_status: string | null;
  updated_at: string | null;
}

const PAGE_SIZE = 50;

const STATUS_OPTIONS = [
  { value: "in_stock",    label: "In Stock" },
  { value: "low_stock",   label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

const MISSING_OPTIONS = [
  { value: "barcode",    label: "Missing Barcode" },
  { value: "category",   label: "Missing Category" },
  { value: "cost_price", label: "Missing Cost Price" },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function MasterInventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filter state — input vs applied search are kept separate so typing doesn't
  // fire a request on every keystroke; search fires on Enter or button click.
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [status, setStatus] = useState("");
  const [missing, setMissing] = useState("");

  // Dropdown options loaded once on mount
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);

  const [exportLoading, setExportLoading] = useState(false);

  // ── Load filter dropdown options ──────────────────────────────────────────

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/inventory/products/filters`, {
      headers: getAdminHeaders(),
    })
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setCategories(json.categories ?? []);
          setSubcategories(json.subcategories ?? []);
        }
      })
      .catch(console.error);
  }, []);

  // ── Fetch products ────────────────────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (subcategory) params.set("subcategory", subcategory);
    if (status) params.set("status", status);
    if (missing) params.set("missing", missing);

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/inventory/products?${params}`,
        { headers: getAdminHeaders() }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setProducts(json.products ?? []);
      setTotal(json.total ?? 0);
    } catch (err: any) {
      toast.error(`Failed to load products: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, subcategory, status, missing]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function applySearch() {
    setPage(1);
    setSearch(searchInput);
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setCategory("");
    setSubcategory("");
    setStatus("");
    setMissing("");
    setPage(1);
  }

  const hasActiveFilter =
    search || category || subcategory || status || missing;

  // ── CSV Export ────────────────────────────────────────────────────────────

  async function handleCSVDownload() {
    setExportLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (category) params.set("category", category);
    if (subcategory) params.set("subcategory", subcategory);
    if (status) params.set("status", status);
    if (missing) params.set("missing", missing);

    try {
      const res = await fetch(
        `${API_BASE}/api/admin/inventory/products/export?${params}`,
        { headers: getAdminHeaders() }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    } finally {
      setExportLoading(false);
    }
  }

  // ── Print / PDF ───────────────────────────────────────────────────────────
  // Triggers the browser print dialog. User can choose "Save as PDF".
  // Print CSS below hides filters and nav, showing only the table.

  function handlePrint() {
    window.print();
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Print-only styles — hides everything except the product table */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #master-inv-print { display: block !important; }
          #master-inv-print .no-print { display: none !important; }
        }
      `}</style>

      <div id="master-inv-print" className="p-4 max-w-6xl mx-auto space-y-4">
        <div className="no-print">
          <InvSubNav />
        </div>

        {/* Header + export buttons */}
        <div className="flex items-start justify-between gap-3 flex-wrap no-print">
          <div>
            <h1 className="text-xl font-semibold">Master Inventory</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {total > 0
                ? `${total.toLocaleString()} product${total !== 1 ? "s" : ""}`
                : loading
                ? "Loading…"
                : "No products found"}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCSVDownload}
              disabled={exportLoading}
            >
              {exportLoading ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1.5" />
              )}
              Download CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" />
              Print / PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3 no-print">
          {/* Search row */}
          <div className="flex gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search name or barcode…"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                className="pl-8"
              />
            </div>
            <Button onClick={applySearch} size="sm" className="shrink-0">
              Search
            </Button>
            {hasActiveFilter && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="shrink-0 text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>

          {/* Filter dropdowns */}
          <div className="flex flex-wrap gap-2">
            {/* Category */}
            <Select
              value={category || "__all__"}
              onValueChange={(v) => {
                setCategory(v === "__all__" ? "" : v);
                setSubcategory("");
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-sm w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Subcategory */}
            <Select
              value={subcategory || "__all__"}
              onValueChange={(v) => {
                setSubcategory(v === "__all__" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-sm w-[170px]">
                <SelectValue placeholder="Subcategory" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Subcategories</SelectItem>
                {subcategories.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Stock status */}
            <Select
              value={status || "__all__"}
              onValueChange={(v) => {
                setStatus(v === "__all__" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-sm w-[150px]">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Missing data */}
            <Select
              value={missing || "__all__"}
              onValueChange={(v) => {
                setMissing(v === "__all__" ? "" : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 text-sm w-[180px]">
                <SelectValue placeholder="Missing Data" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">No missing filter</SelectItem>
                {MISSING_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Barcode</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Subcategory</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="no-print">Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-12 text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ) : products.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-12 text-center text-sm text-muted-foreground"
                      >
                        No products match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    products.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-sm max-w-[200px] truncate">
                          {p.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.barcode ?? (
                            <span className="text-amber-600 text-xs">
                              — missing
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.category ?? (
                            <span className="text-amber-600 text-xs">
                              — missing
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.subcategory ?? "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {p.cost_price != null ? (
                            `KES ${Number(p.cost_price).toLocaleString()}`
                          ) : (
                            <span className="text-amber-600 text-xs">
                              — missing
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          KES {Number(p.price).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {p.stock_quantity ?? 0}
                        </TableCell>
                        <TableCell>
                          <StockBadge status={p.stock_status} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground no-print">
                          {p.updated_at
                            ? new Date(p.updated_at).toLocaleDateString(
                                "en-GB"
                              )
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t no-print">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages} &nbsp;·&nbsp;{" "}
                  {total.toLocaleString()} products total
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1 || loading}
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalPages || loading}
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StockBadge({ status }: { status: string | null }) {
  if (status === "out_of_stock") {
    return (
      <Badge
        variant="destructive"
        className="text-xs whitespace-nowrap"
      >
        Out of Stock
      </Badge>
    );
  }
  if (status === "low_stock") {
    return (
      <Badge
        variant="secondary"
        className="text-xs whitespace-nowrap bg-amber-100 text-amber-800 hover:bg-amber-100"
      >
        Low Stock
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="text-xs whitespace-nowrap bg-green-100 text-green-800 hover:bg-green-100"
    >
      In Stock
    </Badge>
  );
}
