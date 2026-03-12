import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StaffUser {
  id: string;
  customer_id: string;
  name: string;
  phone: string;
  role: "admin" | "product_manager";
  status: "active" | "disabled";
  created_at: string;
  updated_at: string;
}

export const useStaffManagement = () => {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStaff = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("staff_users")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) {
      toast.error("Failed to fetch staff");
      return;
    }
    setStaff((data as StaffUser[]) || []);
    setIsLoading(false);
  }, []);

  const addStaff = useCallback(
    async (name: string, phone: string, role: "admin" | "product_manager") => {
      const { data, error } = await supabase
        .from("staff_users")
        .insert([{ name, phone, role, status: "active" }])
        .select()
        .single();

      if (error) {
        toast.error("Failed to add staff member");
        return null;
      }
      setStaff((prev) => [data as StaffUser, ...prev]);
      toast.success("Staff member added");
      return data;
    },
    []
  );

  const updateStaff = useCallback(
    async (id: string, updates: Partial<StaffUser>) => {
      const { error } = await supabase
        .from("staff_users")
        .update(updates)
        .eq("id", id);

      if (error) {
        toast.error("Failed to update staff member");
        return false;
      }
      setStaff((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
      toast.success("Staff member updated");
      return true;
    },
    []
  );

  const toggleStaffStatus = useCallback(
    async (id: string, currentStatus: string) => {
      const newStatus = currentStatus === "active" ? "disabled" : "active";
      return updateStaff(id, { status: newStatus as "active" | "disabled" });
    },
    [updateStaff]
  );

  return { staff, isLoading, fetchStaff, addStaff, updateStaff, toggleStaffStatus };
};
