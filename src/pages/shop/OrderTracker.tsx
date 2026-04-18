import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ShopHeader } from "@/components/ShopHeader";
import { Package, ChefHat, Truck, CheckCircle, Circle, Loader2, Clock, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/contexts/AppContext";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Order = Tables<"orders">;

interface OrderItem {
  productId?: string;
  name: string;
  quantity: number;
  price: number;
}

const STAGES: { key: string; label: string; icon: typeof Package }[] = [
  { key: "pending",          label: "Order Placed",         icon: Clock },
  { key: "confirmed",        label: "Order Confirmed",      icon: Package },
  { key: "preparing",        label: "Preparing Your Order", icon: ChefHat },
  { key: "out_for_delivery", label: "Out for Delivery",     icon: Truck },
  { key: "delivered",        label: "Delivered",            icon: CheckCircle },
];

const stageIndex = (status: string) => {
  if (status === "cancelled") return -1;
  // backward compat: "received" maps to confirmed stage
  if (status === "received") return STAGES.findIndex((s) => s.key === "confirmed");
  // processed_at_pos sits between confirmed and out_for_delivery
  if (status === "processed_at_pos") return STAGES.findIndex((s) => s.key === "preparing");
  return STAGES.findIndex((s) => s.key === status);
};

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-KE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const OrderTracker = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { setCart } = useApp();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const handleReorder = () => {
    if (!order) return;
    const orderItems = (order.items as unknown as OrderItem[]) || [];
    const cartItems = orderItems
      .filter((item) => !!item.productId)
      .map((item) => ({ productId: item.productId!, quantity: item.quantity }));

    if (cartItems.length === 0) {
      toast.error("Could not reorder — product info is missing for all items in this order.");
      return;
    }

    setCart(cartItems);

    if (cartItems.length < orderItems.length) {
      const missing = orderItems.length - cartItems.length;
      toast.info(
        `${cartItems.length} item(s) added to cart. ${missing} item(s) could not be added (product data missing).`
      );
    } else {
      toast.success("Items added to cart. Review and update before checkout.");
    }

    navigate("/shop/cart");
  };

  useEffect(() => {
    if (!id) { setLoading(false); return; }

    supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) setOrder(data);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <ShopHeader title="Order Status" showBack />
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <ShopHeader title="Order Status" showBack />
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Order not found</p>
        </div>
      </div>
    );
  }

  const items = (order.items as unknown as OrderItem[]) || [];
  const currentIdx = stageIndex(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="min-h-screen bg-background pb-20">
      <ShopHeader title={`Order ${order.order_number}`} showBack />

      <div className="px-4 space-y-4">
        {/* Order info card */}
        <div className="bg-card rounded-xl p-4 card-elevated">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-foreground text-lg">{order.order_number}</span>
            <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
          </div>
          <div className="text-sm text-muted-foreground mb-1">
            {items.map((item, idx) => (
              <span key={idx}>{item.name} ×{item.quantity} &nbsp;</span>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="font-bold text-foreground">KSh {Number(order.total).toLocaleString()}</p>
            <button
              onClick={handleReorder}
              className="flex items-center gap-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-full transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reorder
            </button>
          </div>
        </div>

        {/* Progress tracker */}
        {isCancelled ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center">
            <p className="text-destructive font-semibold">This order was cancelled</p>
          </div>
        ) : (
          <div className="bg-card rounded-xl p-5 card-elevated">
            <h2 className="font-semibold text-foreground mb-5">Order Progress</h2>
            <div className="relative ml-4">
              {STAGES.map((stage, idx) => {
                const StageIcon = stage.icon;
                const isComplete = idx <= currentIdx;
                const isCurrent = idx === currentIdx;

                return (
                  <div key={stage.key} className="flex items-start gap-4 relative">
                    {/* Vertical line */}
                    {idx < STAGES.length - 1 && (
                      <div
                        className={`absolute left-[15px] top-[32px] w-0.5 h-10 ${
                          idx < currentIdx ? "bg-primary" : "bg-border"
                        }`}
                      />
                    )}

                    {/* Icon */}
                    <div
                      className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        isComplete
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      } ${isCurrent ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
                    >
                      {isComplete ? (
                        <StageIcon className="w-4 h-4" />
                      ) : (
                        <Circle className="w-4 h-4" />
                      )}
                    </div>

                    {/* Label */}
                    <div className="pb-10">
                      <p
                        className={`font-medium text-sm ${
                          isComplete ? "text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {stage.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-primary mt-0.5">Current status</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracker;
