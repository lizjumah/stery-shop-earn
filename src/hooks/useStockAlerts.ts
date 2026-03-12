import { useState, useCallback } from "react";
import {
  getStockAlerts,
  createStockAlert,
  resolveStockAlert,
  type StockAlert,
} from "@/lib/api/stockAlertsApi";
import { toast } from "sonner";

export const useStockAlerts = () => {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAlerts = useCallback(async (status?: string) => {
    setIsLoading(true);

    try {
      const data = await getStockAlerts(status);
      setAlerts(data || []);
    } catch (error) {
      console.error("Failed to fetch stock alerts:", error);
      toast.error("Failed to fetch stock alerts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createAlert = useCallback(
    async (
      productId: string,
      alertType: "low_stock" | "out_of_stock",
      threshold: number
    ) => {
      try {
        const data = await createStockAlert({
          product_id: productId,
          alert_type: alertType,
          threshold,
        });

        toast.success("Stock alert created");
        setAlerts((prev) => [data, ...prev]);
        return data;
      } catch (error) {
        console.error("Failed to create alert:", error);
        toast.error("Failed to create alert");
        return null;
      }
    },
    []
  );

  const resolveAlert = useCallback(async (id: string) => {
    try {
      const updated = await resolveStockAlert(id);

      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? updated : a))
      );

      toast.success("Alert resolved");
      return true;
    } catch (error) {
      console.error("Failed to resolve alert:", error);
      toast.error("Failed to resolve alert");
      return false;
    }
  }, []);

  return { alerts, isLoading, fetchAlerts, createAlert, resolveAlert };
};