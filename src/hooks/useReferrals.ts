import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCustomer } from "@/contexts/CustomerContext";

export interface Referral {
  id: string;
  referred_name: string | null;
  referred_phone: string | null;
  bonus_amount: number;
  status: "pending" | "completed";
  created_at: string;
}

export function useReferrals() {
  const { customer } = useCustomer();

  return useQuery<Referral[]>({
    queryKey: ["referrals", customer?.id],
    enabled: !!customer?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("referrals")
        .select("id, referred_name, referred_phone, bonus_amount, status, created_at")
        .eq("referrer_id", customer!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Referral[];
    },
    staleTime: 60 * 1000,
  });
}
