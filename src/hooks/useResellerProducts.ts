import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer } from "@/contexts/CustomerContext";
import { toast } from "sonner";

interface ResellerProduct {
  id: string;
  reseller_id: string;
  product_id: string;
  is_active: boolean;
  created_at: string;
}

const QUERY_KEY = (resellerId: string) => ["reseller_products", resellerId];

/**
 * Fetches and mutates the logged-in reseller's selected product list.
 *
 * How reseller_id is mapped:
 *   The app has no Supabase Auth — sessions are stored in localStorage
 *   as `stery_customer_id` (a UUID). CustomerContext reads this and
 *   exposes `customer.id`. All queries/mutations use that UUID directly
 *   as `reseller_id`. Ownership enforcement is application-layer only
 *   (no JWT), which matches the rest of the codebase (commissions,
 *   referrals, etc.).
 *
 * Returns:
 *   selectedIds  — Set<string> of product_ids for O(1) lookup in the UI
 *   isSelected   — helper: (productId) => boolean
 *   addProduct   — mutation: add a product to this reseller's list
 *   removeProduct — mutation: remove a product from this reseller's list
 */
export function useResellerProducts() {
  const { customer } = useCustomer();
  const queryClient = useQueryClient();

  const query = useQuery<ResellerProduct[]>({
    queryKey: QUERY_KEY(customer?.id ?? ""),
    enabled: !!customer?.id,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reseller_products")
        .select("*")
        .eq("reseller_id", customer!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as ResellerProduct[];
    },
  });

  const selectedIds = new Set((query.data ?? []).map((r) => r.product_id));
  const isSelected = (productId: string) => selectedIds.has(productId);

  const addProduct = useMutation({
    mutationFn: async (productId: string) => {
      if (!customer?.id) throw new Error("Not logged in");
      const { error } = await supabase
        .from("reseller_products")
        .insert({ reseller_id: customer.id, product_id: productId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(customer!.id) });
      toast.success("Added to My Products");
    },
    onError: () => {
      toast.error("Failed to add product — please try again");
    },
  });

  const removeProduct = useMutation({
    mutationFn: async (productId: string) => {
      if (!customer?.id) throw new Error("Not logged in");
      const { error } = await supabase
        .from("reseller_products")
        .delete()
        .eq("reseller_id", customer.id)
        .eq("product_id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY(customer!.id) });
      toast.success("Removed from My Products");
    },
    onError: () => {
      toast.error("Failed to remove product — please try again");
    },
  });

  return {
    ...query,
    selectedIds,
    isSelected,
    addProduct,
    removeProduct,
  };
}
