import React, { useState, useEffect } from "react";
import { useOrderOperations } from "@/hooks/useOrderOperations";
import { Button } from "@/components/ui/button";
import { ShopHeader } from "@/components/ShopHeader";
import { Truck, Package, CheckCircle, AlertCircle, Loader2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

const OrderStatuses = [
  "received",
  "preparing",
  "processed_at_pos",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const OrderOperations = () => {
  const { orders, isLoading, fetchOrders, updateOrderStatus, recordPOSTransaction } =
    useOrderOperations();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [posData, setPosData] = useState({
    receiptNumber: "",
    total: 0,
    notes: "",
  });

  useEffect(() => {
    fetchOrders(statusFilter ? { status: statusFilter } : undefined);
  }, [statusFilter, fetchOrders]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    await updateOrderStatus(orderId, newStatus);
  };

  const handlePOSSubmit = async (orderId: string) => {
    if (!posData.receiptNumber.trim()) {
      return;
    }
    await recordPOSTransaction(
      orderId,
      posData.receiptNumber,
      posData.total,
      posData.notes
    );
    setEditingOrderId(null);
    setPosData({ receiptNumber: "", total: 0, notes: "" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "received":
        return "bg-blue-500/10 text-blue-700";
      case "preparing":
        return "bg-yellow-500/10 text-yellow-700";
      case "processed_at_pos":
        return "bg-purple-500/10 text-purple-700";
      case "out_for_delivery":
        return "bg-orange-500/10 text-orange-700";
      case "delivered":
        return "bg-green-500/10 text-green-700";
      case "cancelled":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <ShopHeader title="Order Operations" showBack />

      <div className="px-4 py-6 space-y-4">
        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setStatusFilter("")}
            className={cn(
              "text-sm rounded-full px-3 py-1.5 font-medium whitespace-nowrap transition-colors",
              statusFilter === ""
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-muted"
            )}
          >
            All Orders
          </button>
          {OrderStatuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "text-sm rounded-full px-3 py-1.5 font-medium whitespace-nowrap transition-colors",
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-muted"
              )}
            >
              {getStatusLabel(status)}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && orders.length === 0 && (
          <div className="bg-secondary rounded-xl p-6 text-center">
            <Package className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground font-medium">No orders found</p>
          </div>
        )}

        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-card rounded-xl p-4 card-elevated border">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">{order.order_number}</h3>
                  <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                </div>
                <span className={cn("text-[10px] font-bold px-2 py-1 rounded-full", getStatusColor(order.status))}>
                  {getStatusLabel(order.status)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Total</p>
                  <p className="font-bold text-foreground">KSh {order.total.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Delivery Area</p>
                  <p className="font-bold text-foreground">{order.delivery_area || "TBD"}</p>
                </div>
              </div>

              {order.pos_receipt_number && (
                <div className="bg-primary/5 rounded-lg p-2 mb-3 text-sm">
                  <p className="text-xs text-muted-foreground">POS Receipt: {order.pos_receipt_number}</p>
                  <p className="font-semibold text-foreground">KSh {order.pos_total?.toLocaleString()}</p>
                </div>
              )}

              {editingOrderId === order.id ? (
                <div className="space-y-2 mb-3 p-3 bg-secondary rounded-lg">
                  <input
                    type="text"
                    placeholder="POS Receipt Number"
                    value={posData.receiptNumber}
                    onChange={(e) => setPosData({ ...posData, receiptNumber: e.target.value })}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    type="number"
                    placeholder="POS Total (KSh)"
                    value={posData.total}
                    onChange={(e) => setPosData({ ...posData, total: parseFloat(e.target.value) || 0 })}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <textarea
                    placeholder="Staff notes (optional)"
                    value={posData.notes}
                    onChange={(e) => setPosData({ ...posData, notes: e.target.value })}
                    rows={2}
                    className="w-full rounded border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingOrderId(null)}
                      className="flex-1 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handlePOSSubmit(order.id)}
                      className="flex-1 bg-primary hover:bg-primary/90 text-xs"
                    >
                      Save POS
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className="flex-1 text-sm rounded border border-border bg-background px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {OrderStatuses.map((status) => (
                      <option key={status} value={status}>
                        {getStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingOrderId(order.id)}
                    className="gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    POS
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderOperations;
