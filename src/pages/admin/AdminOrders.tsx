import { useState, useEffect } from "react";
import { ShopHeader } from "@/components/ShopHeader";
import { Button } from "@/components/ui/button";
import { Package, Phone, MapPin, CreditCard, ChefHat, Truck, CheckCircle, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;
type OrderStatus = Order["status"];

type FilterKey = "all" | "pending" | "confirmed" | "out_for_delivery" | "delivered";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "New" },
  { key: "confirmed", label: "Confirmed" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "New", className: "bg-primary/10 text-primary border-primary/20" },
  confirmed: { label: "Confirmed", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  out_for_delivery: { label: "Out for Delivery", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  delivered: { label: "Delivered", className: "bg-accent/10 text-accent border-accent/20" },
};

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal?: number;
}

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch orders:", error);
      toast.error("Failed to load orders");
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const handleStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update order status");
      return;
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    toast.success(`Order marked as ${STATUS_BADGE[newStatus]?.label || newStatus}`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <ShopHeader title="Admin — Orders" showBack />

      {/* Filters + Refresh */}
      <div className="px-4 pb-3 flex items-center gap-2">
        <div className="flex gap-2 overflow-x-auto no-scrollbar flex-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={fetchOrders}
          className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {/* Order cards */}
      {!loading && (
        <div className="px-4 space-y-3">
          {filtered.map((order) => {
            const badge = STATUS_BADGE[order.status] || STATUS_BADGE.pending;
            const items = (order.items as unknown as OrderItem[]) || [];

            return (
              <div key={order.id} className="bg-card rounded-xl p-4 card-elevated space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold text-foreground">{order.order_number}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>

                {/* Customer info */}
                <div className="space-y-1 text-sm">
                  {order.customer_name && (
                    <p className="text-foreground font-medium">{order.customer_name}</p>
                  )}
                  {order.customer_phone && (
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <Phone className="w-3 h-3" /> {order.customer_phone}
                    </p>
                  )}
                  {order.delivery_location && (
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="w-3 h-3" /> {order.delivery_location}
                      {order.delivery_area && ` (${order.delivery_area})`}
                    </p>
                  )}
                  {order.payment_method && (
                    <p className="text-muted-foreground flex items-center gap-1.5">
                      <CreditCard className="w-3 h-3" /> {order.payment_method === "mpesa" ? "M-Pesa" : "Cash on Delivery"}
                    </p>
                  )}
                </div>

                {/* Items */}
                <div className="text-xs text-muted-foreground">
                  {items.map((item, idx) => (
                    <span key={idx}>{item.name} ×{item.quantity} &nbsp;</span>
                  ))}
                </div>

                {/* Total + date */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{formatDate(order.created_at)}</span>
                  <span className="font-bold text-foreground">KSh {Number(order.total).toLocaleString()}</span>
                </div>

                {/* Delivery fee if applicable */}
                {order.delivery_fee > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Delivery fee: KSh {Number(order.delivery_fee).toLocaleString()}
                  </p>
                )}

                {/* Status actions */}
                {order.status !== "delivered" && (
                  <div className="flex gap-2 flex-wrap">
                    {order.status === "pending" && (
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleStatus(order.id, "confirmed")}>
                        <ChefHat className="w-3 h-3" /> Confirm Order
                      </Button>
                    )}
                    {(order.status === "pending" || order.status === "confirmed") && (
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleStatus(order.id, "out_for_delivery")}>
                        <Truck className="w-3 h-3" /> Out for Delivery
                      </Button>
                    )}
                    <Button size="sm" className="text-xs gap-1 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => handleStatus(order.id, "delivered")}>
                      <CheckCircle className="w-3 h-3" /> Mark Delivered
                    </Button>
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No orders in this category</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
