import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  LayoutList,
  XCircle,
  AlertTriangle,
  Barcode,
  Tag,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvSubNav } from "@/components/InvSubNav";
import { API_BASE, getAdminHeaders } from "@/lib/api/client";

interface OverviewStats {
  total_products: number;
  total_stock_units: number;
  out_of_stock: number;
  low_stock: number;
  missing_barcode: number;
  missing_category: number;
}

export default function InventoryOverview() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/admin/inventory/overview`, {
      headers: getAdminHeaders(),
    })
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error ?? "Failed");
        setStats(json.stats);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <InvSubNav />

      <div>
        <h1 className="text-xl font-semibold">Inventory Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Live snapshot of your product catalog.
        </p>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard
              label="Total Products"
              value={stats.total_products}
              icon={Package}
            />
            <StatCard
              label="Total Stock Units"
              value={stats.total_stock_units}
              icon={LayoutList}
            />
            <StatCard
              label="Out of Stock"
              value={stats.out_of_stock}
              icon={XCircle}
              color={stats.out_of_stock > 0 ? "red" : undefined}
            />
            <StatCard
              label="Low Stock"
              value={stats.low_stock}
              icon={AlertTriangle}
              color={stats.low_stock > 0 ? "amber" : undefined}
            />
            <StatCard
              label="Missing Barcode"
              value={stats.missing_barcode}
              icon={Barcode}
              color={stats.missing_barcode > 0 ? "amber" : undefined}
            />
            <StatCard
              label="Missing Category"
              value={stats.missing_category}
              icon={Tag}
              color={stats.missing_category > 0 ? "amber" : undefined}
            />
          </div>

          <div className="flex flex-wrap gap-3 pt-1">
            <Button asChild>
              <Link to="/admin/inventory/master">View Master Inventory</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/inventory/upload">Daily Stock Upload</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/admin/alerts">Low Stock Alerts</Link>
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color?: "red" | "amber";
}) {
  const valClass =
    color === "red"
      ? "text-destructive"
      : color === "amber"
      ? "text-amber-600"
      : "text-foreground";
  const bgClass =
    color === "red"
      ? "border-destructive/20 bg-destructive/5"
      : color === "amber"
      ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
      : "";

  return (
    <Card className={bgClass}>
      <CardHeader className="pb-1 pt-4 px-4">
        <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <p className={`text-3xl font-bold tabular-nums ${valClass}`}>
          {value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}
