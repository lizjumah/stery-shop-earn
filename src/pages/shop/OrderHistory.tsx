import { useState, useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { ShopHeader } from "@/components/ShopHeader";
import { Package, CheckCircle, Clock, XCircle, ChefHat, Truck, Loader2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;

interface OrderItem {
  productId?: string;
  name: string;
  quantity: number;
  price: number;
}

const statusConfig: Record<string, { icon: any; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: "text-primary", bg: "bg-primary/10", label: "Order Received" },
  confirmed: { icon: ChefHat, color: "text-amber-600", bg: "bg-amber-500/10", label: "Confirmed" },
  out_for_delivery: { icon: Truck, color: "text-blue-600", bg: "bg-blue-500/10", label: "Out for Delivery" },
  delivered: { icon: CheckCircle, color: "text-accent", bg: "bg-accent/10", label: "Delivered" },
  cancelled: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Cancelled" },
};

const OrderHistory = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch orders:", error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <ShopHeader title="My Orders" showBack />

      {/* Refresh button */}
      <div className="px-4 pb-3 flex justify-end">
        <button
          onClick={fetchOrders}
          className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {/* Orders list */}
      {!loading && (
        <div className="px-4 space-y-3">
          {orders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = config.icon;
            const items = (order.items as unknown as OrderItem[]) || [];

            return (
              <button
                key={order.id}
                onClick={() => navigate(`/shop/order/${order.id}`)}
                className="w-full text-left bg-card rounded-xl p-4 card-elevated"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <span className="font-bold text-foreground">{order.order_number}</span>
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${config.bg} ${config.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {config.label}
                  </span>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {items.slice(0, 3).map((item, idx) => (
                    <span key={idx}>{item.name} ×{item.quantity} &nbsp;</span>
                  ))}
                  {items.length > 3 && <span>+{items.length - 3} more</span>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                  <span className="font-bold text-foreground">KSh {Number(order.total).toLocaleString()}</span>
                </div>
                {order.points_earned > 0 && (
                  <p className="text-xs text-primary mt-1">+{order.points_earned} points earned</p>
                )}
                <p className="text-[10px] text-primary mt-1">Tap to track →</p>
              </button>
            );
          })}

          {orders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No orders yet</p>
            </div>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default OrderHistory;
