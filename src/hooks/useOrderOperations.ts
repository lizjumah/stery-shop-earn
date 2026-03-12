import { useState, useCallback } from "react";
import { supabase } from "@/integrations";
import { toast } from "sonner";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

async function adminFetch(path: string, method: string, body?: object) {
  const customerId = localStorage.getItem("stery_customer_id") || "";
  const res = await fetch(`${BACKEND_URL}/api/admin${path}`, {
    method,
    headers: { "Content-Type": "application/json", "X-Customer-ID": customerId },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || json.message || `HTTP ${res.status}`);
  return json;
}

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  total: number;
  status: string;
  delivery_area: string;
  customer_phone: string;
  pos_receipt_number?: string;
  pos_total?: number;
  pos_processed_at?: string;
  staff_notes?: string;
  created_at: string;
}

export const useOrderOperations = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = useCallback(async (filters?: { status?: string }) => {
    setIsLoading(true);
    let query = supabase.from("orders").select("*");

    if (filters?.status) {
      query = query.eq("status", filters.status as any);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch orders");
      return;
    }
    setOrders(data || []);
    setIsLoading(false);
  }, []);

  const updateOrderStatus = useCallback(
    async (id: string, status: string) => {
      try {
        await adminFetch(`/orders/${id}/status`, "POST", { status });
        setOrders((prev) =>
          prev.map((o) => (o.id === id ? { ...o, status } : o))
        );
        toast.success("Order status updated");
        return true;
      } catch (err: any) {
        const isOffline = err instanceof TypeError || err.message?.includes("fetch");
        toast.error(
          isOffline
            ? "Backend offline — run: npm run dev:backend"
            : `Failed to update order: ${err.message}`
        );
        return false;
      }
    },
    []
  );

  const recordPOSTransaction = useCallback(
    async (
      id: string,
      posReceiptNumber: string,
      posTotal: number,
      notes?: string
    ) => {
      try {
        await adminFetch(`/orders/${id}/pos`, "POST", {
          pos_receipt_number: posReceiptNumber,
          pos_total: posTotal,
          staff_notes: notes,
        });
        setOrders((prev) =>
          prev.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status: "processed_at_pos",
                  pos_receipt_number: posReceiptNumber,
                  pos_total: posTotal,
                  staff_notes: notes,
                }
              : o
          )
        );
        toast.success("POS transaction recorded");
        return true;
      } catch (err: any) {
        const isOffline = err instanceof TypeError || err.message?.includes("fetch");
        toast.error(
          isOffline
            ? "Backend offline — run: npm run dev:backend"
            : `Failed to record POS transaction: ${err.message}`
        );
        return false;
      }
    },
    []
  );

  return {
    orders,
    isLoading,
    fetchOrders,
    updateOrderStatus,
    recordPOSTransaction,
  };
};
