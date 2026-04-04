import { useState, useEffect } from "react";
import { ShopHeader } from "@/components/ShopHeader";
import { Button } from "@/components/ui/button";
import { Package, Phone, MapPin, CreditCard, ChefHat, Truck, CheckCircle, Loader2, RefreshCw, MessageCircle, Banknote } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

import { API_BASE } from "@/lib/api/client";
import { useOwnerPinContext } from "@/contexts/OwnerPinContext";
const BACKEND_URL = API_BASE;

type Order = Tables<"orders">;
type OrderStatus = Order["status"];

type FilterKey = "all" | "pending" | "confirmed" | "received" | "preparing" | "processed_at_pos" | "out_for_delivery" | "delivered" | "cancelled";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "received", label: "Received" },
  { key: "preparing", label: "Preparing" },
  { key: "processed_at_pos", label: "POS Processed" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-secondary text-muted-foreground border-border" },
  confirmed: { label: "Confirmed", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  received: { label: "Received", className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  preparing: { label: "Preparing", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  processed_at_pos: { label: "POS Processed", className: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
  out_for_delivery: { label: "Out for Delivery", className: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  delivered: { label: "Delivered", className: "bg-accent/10 text-accent border-accent/20" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/20" },
};

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal?: number;
}

function whatsappPaymentLink(phone: string, name: string, total: number): string {
  // Strip all non-digit characters (spaces, dashes, parentheses, leading +)
  let normalized = phone.replace(/\D/g, "");
  if (normalized.startsWith("254") && normalized.length === 12) {
    // Already in 254XXXXXXXXX format — use as-is
  } else if (normalized.startsWith("0") && normalized.length === 10) {
    // 07XXXXXXXX → 2547XXXXXXXX
    normalized = "254" + normalized.slice(1);
  }
  const message =
    `Hi ${name}, thanks for ordering from Stery.\n` +
    `Your total is KES ${Number(total).toLocaleString()}.\n` +
    `Please pay via M-Pesa to confirm preparation of your order.\n` +
    `We'll start preparing it as soon as payment is received.`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

// Statuses that require payment to be confirmed first
const PAYMENT_GATED_STATUSES: OrderStatus[] = [
  "preparing",
  "processed_at_pos",
  "out_for_delivery",
  "delivered",
];

const PAYMENT_STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending:           { label: "Unpaid",            className: "bg-red-500/10 text-red-600 border-red-500/20" },
  paid:              { label: "Paid",               className: "bg-green-500/10 text-green-700 border-green-500/20" },
  delivery_fee_paid: { label: "Delivery Fee Paid",  className: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
};

// Statuses that are "post-processing" and require owner PIN to set
const OWNER_GATED_STATUSES: OrderStatus[] = ["out_for_delivery", "delivered", "cancelled"];

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");
  const { requireOwnerPin } = useOwnerPinContext();

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
    // Poll every 30 s so new orders appear without a manual refresh
    const interval = setInterval(fetchOrders, 30_000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const handlePaymentStatus = async (orderId: string, newPaymentStatus: string) => {
    const customerId = localStorage.getItem("stery_customer_id") || "";

    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/orders/${orderId}/payment-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Customer-ID": customerId,
        },
        body: JSON.stringify({ payment_status: newPaymentStatus }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
    } catch (err: any) {
      const isNetworkError =
        err instanceof TypeError ||
        err.message?.includes("fetch") ||
        err.message?.includes("Failed to fetch") ||
        err.message?.includes("NetworkError");

      if (!isNetworkError) {
        toast.error(`Failed to update payment status: ${err.message}`);
        return;
      }

      // Backend offline — fall back to direct Supabase
      const { error } = await supabase
        .from("orders")
        .update({
          payment_status: newPaymentStatus,
          ...(newPaymentStatus === "paid" ? { paid_at: new Date().toISOString() } : {}),
        } as any)
        .eq("id", orderId);

      if (error) {
        toast.error("Failed to update payment status");
        return;
      }
    }

    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              payment_status: newPaymentStatus,
              ...(newPaymentStatus === "paid" ? { paid_at: new Date().toISOString() } : {}),
            }
          : o
      )
    );
    toast.success(PAYMENT_STATUS_BADGE[newPaymentStatus]?.label ?? newPaymentStatus);
    fetchOrders();
  };

  const handleStatus = async (orderId: string, newStatus: OrderStatus) => {
    // Gate post-processing status changes with owner PIN
    if (OWNER_GATED_STATUSES.includes(newStatus)) {
      const label = newStatus === "cancelled" ? "Cancel order" : `Mark as ${STATUS_BADGE[newStatus]?.label ?? newStatus}`;
      const ok = await requireOwnerPin(label);
      if (!ok) return;
    }

    // Block dispatch/preparation if payment has not been confirmed
    if (PAYMENT_GATED_STATUSES.includes(newStatus)) {
      const order = orders.find((o) => o.id === orderId);
      if (order && order.payment_status === "pending") {
        toast.error("Payment must be confirmed before preparation or dispatch.");
        return;
      }
    }

    const customerId = localStorage.getItem("stery_customer_id") || "";

    // Try backend first (uses service role key — bypasses RLS)
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/orders/${orderId}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Customer-ID": customerId,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
        toast.success(`Order marked as ${STATUS_BADGE[newStatus]?.label || newStatus}`);
        return;
      }

      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    } catch (backendErr: any) {
      // Backend not reachable — fall back to direct Supabase update
      const isNetworkError =
        backendErr instanceof TypeError ||
        backendErr.message?.includes("fetch") ||
        backendErr.message?.includes("Failed to fetch") ||
        backendErr.message?.includes("NetworkError");

      if (!isNetworkError) {
        console.error("Backend order status error:", backendErr.message);
        toast.error(`Failed to update status: ${backendErr.message}`);
        return;
      }

      // Backend offline — try direct update (only works if RLS allows it)
      const { data, error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId)
        .select("id");

      if (error) {
        console.error("Direct update error:", error);
        toast.error("Failed to update status. Run: npm run dev:backend");
        return;
      }

      if (!data || data.length === 0) {
        toast.error("Status not saved — backend server is required. Run: npm run dev:backend");
        return;
      }

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      toast.success(`Order marked as ${STATUS_BADGE[newStatus]?.label || newStatus}`);
    }
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
            const badge = STATUS_BADGE[order.status] || STATUS_BADGE.received;
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

                {/* Payment status badge + actions */}
                {(() => {
                  const ps = order.payment_status ?? "pending";
                  const psBadge = PAYMENT_STATUS_BADGE[ps] ?? PAYMENT_STATUS_BADGE.pending;
                  return (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${psBadge.className}`}>
                        {psBadge.label}
                      </span>
                      {ps === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs gap-1 text-green-700 border-green-600/30 hover:bg-green-50"
                            onClick={() => handlePaymentStatus(order.id, "paid")}
                          >
                            <Banknote className="w-3 h-3" /> Mark as Paid
                          </Button>
                          {order.delivery_fee > 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs gap-1 text-blue-600 border-blue-500/30 hover:bg-blue-50"
                              onClick={() => handlePaymentStatus(order.id, "delivery_fee_paid")}
                            >
                              <Truck className="w-3 h-3" /> Delivery Fee Paid
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  );
                })()}

                {/* WhatsApp payment request — only for unpaid orders */}
                {order.customer_phone && order.customer_name && (order.payment_status ?? "pending") === "pending" && (
                  <a
                    href={whatsappPaymentLink(order.customer_phone, order.customer_name, order.total)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button size="sm" variant="outline" className="text-xs gap-1 w-full text-green-600 border-green-600/30 hover:bg-green-50">
                      <MessageCircle className="w-3 h-3" /> Request Payment on WhatsApp
                    </Button>
                  </a>
                )}

                {/* Status actions */}
                {order.status !== "delivered" && order.status !== "cancelled" && (
                  <div className="flex gap-2 flex-wrap">
                    {order.status === "pending" && (
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleStatus(order.id, "confirmed")}>
                        <CheckCircle className="w-3 h-3" /> Confirm
                      </Button>
                    )}
                    {(order.status === "confirmed" || order.status === "received") && (
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleStatus(order.id, "preparing")}>
                        <ChefHat className="w-3 h-3" /> Preparing
                      </Button>
                    )}
                    {order.status === "preparing" && (
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleStatus(order.id, "processed_at_pos")}>
                        <CreditCard className="w-3 h-3" /> POS Processed
                      </Button>
                    )}
                    {order.status === "processed_at_pos" && (
                      <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => handleStatus(order.id, "out_for_delivery")}>
                        <Truck className="w-3 h-3" /> Out for Delivery
                      </Button>
                    )}
                    {order.status === "out_for_delivery" && (
                      <Button size="sm" className="text-xs gap-1 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => handleStatus(order.id, "delivered")}>
                        <CheckCircle className="w-3 h-3" /> Delivered
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs gap-1 text-destructive hover:bg-destructive/10" onClick={() => handleStatus(order.id, "cancelled")}>
                      Cancel Order
                    </Button>
                  </div>
                )}
                {order.status === "delivered" && (
                  <div className="text-xs font-medium text-accent">✓ Order Delivered</div>
                )}
                {order.status === "cancelled" && (
                  <div className="text-xs font-medium text-destructive">✗ Order Cancelled</div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-muted-foreground font-medium">No orders yet.</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Orders will appear here when customers place them.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
