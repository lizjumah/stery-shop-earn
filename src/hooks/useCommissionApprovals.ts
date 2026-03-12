import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CommissionApproval {
  id: string;
  customer_id: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "paid";
  mpesa_number?: string;
  rejection_reason?: string;
  approved_by?: string;
  created_at: string;
  updated_at: string;
  approved_at?: string;
  paid_at?: string;
}

export const useCommissionApprovals = () => {
  const [approvals, setApprovals] = useState<CommissionApproval[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchApprovals = useCallback(async (status?: string) => {
    setIsLoading(true);
    let query: any = supabase.from("commission_approvals").select("*");

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch commission approvals");
      return;
    }
    setApprovals((data || []) as CommissionApproval[]);
    setIsLoading(false);
  }, []);

  const approveCommission = useCallback(
    async (id: string, staffId: string) => {
      const { error } = await supabase
        .from("commission_approvals")
        .update({
          status: "approved",
          approved_by: staffId,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        toast.error("Failed to approve commission");
        return false;
      }
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: "approved" as const,
                approved_by: staffId,
                approved_at: new Date().toISOString(),
              }
            : a
        )
      );
      toast.success("Commission approved");
      return true;
    },
    []
  );

  const rejectCommission = useCallback(
    async (id: string, reason: string) => {
      const { error } = await supabase
        .from("commission_approvals")
        .update({
          status: "rejected",
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        toast.error("Failed to reject commission");
        return false;
      }
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: "rejected" as const,
                rejection_reason: reason,
              }
            : a
        )
      );
      toast.success("Commission rejected");
      return true;
    },
    []
  );

  const markAsPaid = useCallback(
    async (id: string) => {
      const { error } = await (supabase.from("commission_approvals") as any)
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        toast.error("Failed to mark as paid");
        return false;
      }
      setApprovals((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: "paid" as const,
                paid_at: new Date().toISOString(),
              }
            : a
        )
      );
      toast.success("Marked as paid");
      return true;
    },
    []
  );

  return {
    approvals,
    isLoading,
    fetchApprovals,
    approveCommission,
    rejectCommission,
    markAsPaid,
  };
};
