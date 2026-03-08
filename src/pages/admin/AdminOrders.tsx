import { useState } from "react";
import { useApp, OrderStatus } from "@/contexts/AppContext";
import { orderHistory } from "@/data/user";
import { ShopHeader } from "@/components/ShopHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Phone, MapPin, CreditCard, ChefHat, Truck, CheckCircle } from "lucide-react";
import { toast } from "sonner";

type FilterKey = "all" | "received" | "preparing" | "out_for_delivery" | "delivered";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "received", label: "New" },
  { key: "preparing", label: "Preparing" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Completed" },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  received: { label: "New", className: "bg-primary/10 text-primary border-primary/20" },
  preparing: { label: "Preparing", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  out_for_delivery: { label: "Out for Delivery", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  delivered: { label: "Delivered", className: "bg-accent/10 text-accent border-accent/20" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const AdminOrders = () => {
  const { orders: placedOrders, updateOrderStatus } = useApp();
  const [filter, setFilter] = useState<FilterKey>("all");

  const allOrders = [...placedOrders, ...orderHistory];
  const filtered = filter === "all" ? allOrders : allOrders.filter((o) => o.status === filter);

  const handleStatus = (orderId: string, status: OrderStatus) => {
    updateOrderStatus(orderId, status);
    toast.success(`Order marked as ${STATUS_BADGE[status]?.label || status}`);
  };

  return (
    <div className="min-h-screen bg-background pb-6">
      <ShopHeader title="Admin — Orders" showBack />

      {/* Filters */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
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

      {/* Order cards */}
      <div className="px-4 space-y-3">
        {filtered.map((order) => {
          const badge = STATUS_BADGE[order.status] || STATUS_BADGE.received;
          return (
            <div key={order.id} className="bg-card rounded-xl p-4 card-elevated space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="font-bold text-foreground">{order.orderNumber}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badge.className}`}>
                  {badge.label}
                </span>
              </div>

              {/* Customer info */}
              <div className="space-y-1 text-sm">
                {(order as any).customerName && (
                  <p className="text-foreground font-medium">{(order as any).customerName}</p>
                )}
                {(order as any).phone && (
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <Phone className="w-3 h-3" /> {(order as any).phone}
                  </p>
                )}
                {(order as any).location && (
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> {(order as any).location}
                  </p>
                )}
                {(order as any).paymentMethod && (
                  <p className="text-muted-foreground flex items-center gap-1.5">
                    <CreditCard className="w-3 h-3" /> {(order as any).paymentMethod === "mpesa" ? "M-Pesa" : "Cash on Delivery"}
                  </p>
                )}
              </div>

              {/* Items */}
              <div className="text-xs text-muted-foreground">
                {order.items.map((item) => (
                  <span key={item.productId}>{item.name} ×{item.quantity} &nbsp;</span>
                ))}
              </div>

              {/* Total + date */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{order.date}</span>
                <span className="font-bold text-foreground">KSh {order.total.toLocaleString()}</span>
              </div>

              {/* Status actions */}
              {order.status !== "delivered" && order.status !== "cancelled" && (
                <div className="flex gap-2 flex-wrap">
                  {order.status === "received" && (
                    <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleStatus(order.id, "preparing")}>
                      <ChefHat className="w-3 h-3" /> Mark Preparing
                    </Button>
                  )}
                  {(order.status === "received" || order.status === "preparing") && (
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
    </div>
  );
};

export default AdminOrders;
