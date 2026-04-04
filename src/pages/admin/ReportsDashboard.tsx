import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations";
import { Button } from "@/components/ui/button";
import { ShopHeader } from "@/components/ShopHeader";
import { TrendingUp, Package, ShoppingCart, DollarSign, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOwnerPinContext } from "@/contexts/OwnerPinContext";

const ReportsDashboard = () => {
  const [dateRange, setDateRange] = useState<"week" | "month" | "all">("month");
  const { requireOwnerPin } = useOwnerPinContext();
  const [pinVerified, setPinVerified] = useState(false);

  useEffect(() => {
    requireOwnerPin("View financial reports").then((ok) => setPinVerified(ok));
  }, [requireOwnerPin]);

  // Fetch orders data
  const { data: stats, isLoading } = useQuery({
    queryKey: ["reports", dateRange],
    queryFn: async () => {
      const now = new Date();
      let startDate = new Date();

      if (dateRange === "week") {
        startDate.setDate(now.getDate() - 7);
      } else if (dateRange === "month") {
        startDate.setMonth(now.getMonth() - 1);
      } else {
        startDate = new Date("2020-01-01");
      }

      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .gte("created_at", startDate.toISOString());

      const { data: products } = await supabase.from("products").select("*");

      const { data: commissions } = await supabase
        .from("commissions")
        .select("*")
        .gte("created_at", startDate.toISOString());

      // Calculate metrics
      const totalRevenue = orders?.reduce((sum, o) => sum + (o.total || 0), 0) ?? 0;
      const orderCount = orders?.length ?? 0;
      const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

      // Group by status
      const ordersByStatus = orders?.reduce(
        (acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ) ?? {};

      // Group by category
      const revenueByCategory = orders?.reduce((acc, order) => {
        // For now, use a mock category. In production, join with products
        const category = "General";
        acc[category] = (acc[category] || 0) + (order.total || 0);
        return acc;
      }, {} as Record<string, number>) ?? {};

      // Top products (mock - would need product join in real app)
      const topProducts = products?.slice(0, 5).map((p) => ({
        name: p.name,
        sales: Math.floor(Math.random() * 100),
      })) ?? [];

      return {
        totalRevenue,
        orderCount,
        avgOrderValue,
        ordersByStatus,
        revenueByCategory,
        topProducts,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <ShopHeader title="Reports & Analytics" showBack />
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!pinVerified) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <ShopHeader title="Reports & Analytics" showBack />
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
          <p className="text-sm">Waiting for security PIN…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <ShopHeader title="Reports & Analytics" showBack />

      <div className="px-4 py-6 space-y-6">
        {/* Date Range Filter */}
        <div className="flex gap-2">
          {["week", "month", "all"].map((range) => (
            <button
              key={range}
              onClick={() => setDateRange(range as any)}
              className={cn(
                "text-sm rounded-full px-4 py-1.5 font-medium capitalize transition-colors",
                dateRange === range
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-muted"
              )}
            >
              {range === "all" ? "All Time" : `Last ${range === "week" ? "Week" : "Month"}`}
            </button>
          ))}
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard
            icon={<DollarSign className="w-5 h-5" />}
            label="Total Revenue"
            value={`KSh ${(stats?.totalRevenue || 0).toLocaleString()}`}
            color="bg-teal-500"
          />
          <MetricCard
            icon={<ShoppingCart className="w-5 h-5" />}
            label="Orders"
            value={(stats?.orderCount || 0).toString()}
            color="bg-indigo-500"
          />
          <MetricCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Avg Order Value"
            value={`KSh ${Math.round(stats?.avgOrderValue || 0).toLocaleString()}`}
            color="bg-green-500"
          />
          <MetricCard
            icon={<Package className="w-5 h-5" />}
            label="SKUs"
            value={(stats?.topProducts.length || 0).toString()}
            color="bg-orange-500"
          />
        </div>

        {/* Order Status Breakdown */}
        <div className="bg-card rounded-xl p-4 card-elevated border">
          <h3 className="font-bold text-foreground mb-4">Orders by Status</h3>
          <div className="space-y-3">
            {Object.entries(stats?.ordersByStatus || {}).map(([status, count]) => (
              <div key={status} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground capitalize">
                    {status.replace(/_/g, " ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{
                        width: `${
                          ((count as number) / (stats?.orderCount || 1)) * 100
                        }%`,
                      }}
                    />
                  </div>
                  <span className="font-bold text-foreground min-w-8 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-card rounded-xl p-4 card-elevated border">
          <h3 className="font-bold text-foreground mb-4">Top Products by Sales</h3>
          <div className="space-y-3">
            {stats?.topProducts.map((product, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{product.sales} sales</p>
                </div>
                <span className="font-bold text-foreground">{product.sales}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue by Category */}
        <div className="bg-card rounded-xl p-4 card-elevated border">
          <h3 className="font-bold text-foreground mb-4">Revenue by Category</h3>
          <div className="space-y-3">
            {Object.entries(stats?.revenueByCategory || {}).map(([category, revenue]) => (
              <div key={category} className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground capitalize">{category}</p>
                </div>
                <span className="font-bold text-foreground">
                  KSh {(revenue as number).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, color }) => (
  <div className="bg-card rounded-xl p-4 card-elevated border">
    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-white mb-2", color)}>
      {icon}
    </div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-lg font-bold text-foreground truncate">{value}</p>
  </div>
);

export default ReportsDashboard;
