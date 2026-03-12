import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer } from "@/contexts/CustomerContext";

export interface Commission {
  id: string;
  product_name: string;
  amount: number;
  status: "pending" | "confirmed" | "paid" | "withdrawn";
  created_at: string;
  order_id: string | null;
}

export function useCommissions() {
  const { customer } = useCustomer();

  return useQuery<Commission[]>({
    queryKey: ["commissions", customer?.id],
    enabled: !!customer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("commissions")
        .select("id, product_name, amount, status, created_at, order_id")
        .eq("reseller_id", customer!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Commission[];
    },
    staleTime: 60 * 1000,
  });
}
