import { useApp } from "@/contexts/AppContext";
import { orderHistory } from "@/data/user";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, Package, CheckCircle, Clock, XCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const statusConfig = {
  pending: { icon: Clock, color: "text-primary", bg: "bg-primary/10", label: "Pending" },
  delivered: { icon: CheckCircle, color: "text-accent", bg: "bg-accent/10", label: "Delivered" },
  cancelled: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Cancelled" },
};

const OrderHistory = () => {
  const navigate = useNavigate();
  const { orders: placedOrders } = useApp();

  const allOrders = [...placedOrders, ...orderHistory];

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 pt-6 pb-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="bg-secondary rounded-full p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Order History</h1>
      </div>

      <div className="px-4 space-y-3">
        {allOrders.map((order) => {
          const config = statusConfig[order.status];
          const StatusIcon = config.icon;
          return (
            <div key={order.id} className="bg-card rounded-xl p-4 card-elevated">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <span className="font-bold text-foreground">{order.orderNumber}</span>
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${config.bg} ${config.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {config.label}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                {order.items.map((item) => (
                  <span key={item.productId}>{item.name} ×{item.quantity} &nbsp;</span>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{order.date}</span>
                <span className="font-bold text-foreground">KSh {order.total}</span>
              </div>
              {order.pointsEarned > 0 && (
                <p className="text-xs text-primary mt-1">+{order.pointsEarned} points earned</p>
              )}
            </div>
          );
        })}

        {allOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No orders yet</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default OrderHistory;
