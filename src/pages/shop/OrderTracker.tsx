import { useParams, useNavigate } from "react-router-dom";
import { useApp, OrderStatus } from "@/contexts/AppContext";
import { orderHistory } from "@/data/user";
import { ShopHeader } from "@/components/ShopHeader";
import { BottomNav } from "@/components/BottomNav";
import { Package, ChefHat, Truck, CheckCircle, Circle } from "lucide-react";

const STAGES: { key: OrderStatus; label: string; icon: typeof Package }[] = [
  { key: "received", label: "Order Received", icon: Package },
  { key: "preparing", label: "Preparing Your Order", icon: ChefHat },
  { key: "out_for_delivery", label: "Out for Delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle },
];

const stageIndex = (status: OrderStatus) => {
  if (status === "cancelled") return -1;
  return STAGES.findIndex((s) => s.key === status);
};

const OrderTracker = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { orders } = useApp();

  const allOrders = [...orders, ...orderHistory];
  const order = allOrders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <ShopHeader title="Order Status" showBack />
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">Order not found</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  const currentIdx = stageIndex(order.status as OrderStatus);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="min-h-screen bg-background pb-20">
      <ShopHeader title={`Order ${order.orderNumber}`} showBack />

      <div className="px-4 space-y-4">
        {/* Order info card */}
        <div className="bg-card rounded-xl p-4 card-elevated">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-foreground text-lg">{order.orderNumber}</span>
            <span className="text-xs text-muted-foreground">{order.date}</span>
          </div>
          <div className="text-sm text-muted-foreground mb-1">
            {order.items.map((item) => (
              <span key={item.productId}>{item.name} ×{item.quantity} &nbsp;</span>
            ))}
          </div>
          <p className="font-bold text-foreground">KSh {order.total.toLocaleString()}</p>
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

      <BottomNav />
    </div>
  );
};

export default OrderTracker;
