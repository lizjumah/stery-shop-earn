import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DeliveryRoute {
  id: string;
  area_name: string;
  delivery_fee: number;
  status: "active" | "disabled";
  created_at: string;
  updated_at: string;
}

export const useDeliveryRoutes = () => {
  const [routes, setRoutes] = useState<DeliveryRoute[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRoutes = useCallback(async (includeDisabled = false) => {
    setIsLoading(true);
    let query: any = supabase.from("delivery_routes").select("*");

    if (!includeDisabled) {
      query = query.eq("status", "active");
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch delivery routes");
      return;
    }
    const typedData = (data || []) as DeliveryRoute[];
    setRoutes(typedData);
    setIsLoading(false);
  }, []);

  const addRoute = useCallback(
    async (area_name: string, delivery_fee: number) => {
      const { data, error } = await supabase
        .from("delivery_routes")
        .insert([{ area_name, delivery_fee, status: "active" }])
        .select()
        .single();

      if (error) {
        if ((error as any).code === "23505") {
          toast.error("This delivery area already exists");
        } else {
          toast.error("Failed to add delivery route");
        }
        return null;
      }
      const typed = data as DeliveryRoute;
      setRoutes((prev) => [typed, ...prev]);
      toast.success("Delivery route added");
      return data;
    },
    []
  );

  const updateRoute = useCallback(
    async (id: string, updates: Partial<DeliveryRoute>) => {
      const { error } = await supabase
        .from("delivery_routes")
        .update(updates)
        .eq("id", id);

      if (error) {
        toast.error("Failed to update delivery route");
        return false;
      }
      setRoutes((prev) =>
        prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
      );
      toast.success("Delivery route updated");
      return true;
    },
    []
  );

  const toggleStatus = useCallback(
    async (id: string, currentStatus: string) => {
      const newStatus = currentStatus === "active" ? "disabled" : "active";
      return updateRoute(id, { status: newStatus as "active" | "disabled" });
    },
    [updateRoute]
  );

  return { routes, isLoading, fetchRoutes, addRoute, updateRoute, toggleStatus };
};
