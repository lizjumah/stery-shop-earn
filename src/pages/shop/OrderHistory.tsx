import { useState, useEffect } from "react";
import { ShopHeader } from "@/components/ShopHeader";
import { useCustomer } from "@/contexts/CustomerContext";
import { useApp } from "@/contexts/AppContext";
import { useProducts } from "@/hooks/useProducts";
import { Package, CheckCircle, Clock, XCircle, ChefHat, Truck, Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
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
  pending: { icon: Clock, color: "text-muted-foreground", bg: "bg-secondary", label: "Pending" },
  confirmed: { icon: Package, color: "text-primary", bg: "bg-primary/10", label: "Confirmed" },
  received: { icon: Package, color: "text-primary", bg: "bg-primary/10", label: "Order Received" },
  preparing: { icon: ChefHat, color: "text-amber-600", bg: "bg-amber-500/10", label: "Preparing" },
  processed_at_pos: { icon: ChefHat, color: "text-purple-600", bg: "bg-purple-500/10", label: "POS Processed" },
  out_for_delivery: { icon: Truck, color: "text-blue-600", bg: "bg-blue-500/10", label: "Out for Delivery" },
  delivered: { icon: CheckCircle, color: "text-accent", bg: "bg-accent/10", label: "Delivered" },
  cancelled: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Cancelled" },
};

const OrderHistory = () => {
  const navigate = useNavigate();
  const { customer } = useCustomer();
  const { setCart } = useApp();
  const { data: liveProducts } = useProducts();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);

    if (!customer) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .eq("customer_id", customer.id)
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
  }, [customer?.id]);

  const handleReorder = (order: Order) => {
    const items = (order.items as unknown as OrderItem[]) || [];
    const products = liveProducts ?? [];

    const added: { productId: string; quantity: number }[] = [];
    const skipped: string[] = [];

    for (const item of items) {
      if (!item.productId) {
        skipped.push(item.name);
        continue;
      }
      const live = products.find((p) => p.id === item.productId);
      if (!live) {
        skipped.push(item.name);
        continue;
      }
      if (!live.inStock || (live.stockQuantity != null && live.stockQuantity === 0)) {
        skipped.push(live.name);
        continue;
      }
      added.push({ productId: item.productId, quantity: item.quantity });
    }

    if (added.length === 0) {
      toast.error("None of the items from this order are currently available.");
      return;
    }

    setCart(added);

    if (skipped.length > 0) {
      toast.info(
        `${added.length} item(s) added to cart. ${skipped.length} item(s) skipped (unavailable or no longer sold).`
      );
    } else {
      toast.success(`${added.length} item(s) added to cart at current prices.`);
    }

    navigate("/shop/cart");
  };

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

      <div className="px-4 pb-3 flex justify-end">
        <button
          onClick={fetchOrders}
          className="p-2 rounded-full bg-secondary hover:bg-secondary/80 transition-colors"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      )}

      {!loading && (
        <div className="px-4 space-y-3">
          {orders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.received;
            const StatusIcon = config.icon;
            const items = (order.items as unknown as OrderItem[]) || [];

            return (
              <div key={order.id} className="bg-card rounded-xl p-4 card-elevated">
                {/* Header */}
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

                {/* Items preview */}
                <div className="text-sm text-muted-foreground mb-2">
                  {items.slice(0, 3).map((item, idx) => (
                    <span key={idx}>{item.name} ×{item.quantity} &nbsp;</span>
                  ))}
                  {items.length > 3 && <span>+{items.length - 3} more</span>}
                </div>

                {/* Total + date */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                  <span className="font-bold text-foreground">KSh {Number(order.total).toLocaleString()}</span>
                </div>

                {order.points_earned > 0 && (
                  <p className="text-xs text-primary mt-1">+{order.points_earned} points earned</p>
                )}

                {/* Actions — Track order vs Reorder, clearly separated */}
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50">
                  <button
                    onClick={() => navigate(`/shop/order/${order.id}`)}
                    className="text-xs text-primary font-medium"
                  >
                    Track order →
                  </button>
                  {(order.status === "delivered" || order.status === "completed" || order.status === "received") && (
                    <button
                      onClick={() => handleReorder(order)}
                      className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reorder
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {orders.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No orders yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderHistory;
