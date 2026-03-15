import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { normalizeKenyanPhone } from "@/lib/normalizePhone";

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
    async (name: string, phone: string, role: "admin" | "product_manager", pin?: string) => {
      const normalized = normalizeKenyanPhone(phone);

      // Step 1: Ensure a customers row exists so the staff member can log in by phone.
      let customerId: string;

      const { data: existing } = await supabase
        .from("customers")
        .select("id")
        .eq("phone", normalized)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("customers")
          .update({ role: "staff", ...(pin ? { staff_pin: pin } : {}) } as any)
          .eq("id", existing.id);
        customerId = existing.id;
      } else {
        const { data: newCustomer, error: createError } = await supabase
          .from("customers")
          .insert({ name, phone: normalized, role: "staff", ...(pin ? { staff_pin: pin } : {}) } as any)
          .select("id")
          .single();

        if (createError || !newCustomer) {
          toast.error("Failed to create staff login account");
          return null;
        }
        customerId = newCustomer.id;
      }

      // Step 2: Insert into staff_users for management records.
      const { data, error } = await supabase
        .from("staff_users")
        .insert([{ name, phone: normalized, role, status: "active", customer_id: customerId }])
        .select()
        .single();

      if (error) {
        toast.error("Failed to add staff member");
        return null;
      }

      setStaff((prev) => [data as StaffUser, ...prev]);
      toast.success("Staff member added — they can now log in with their phone number and PIN");
      return data;
    },
    []
  );

  const updateStaff = useCallback(
    async (id: string, updates: Partial<StaffUser> & { pin?: string }) => {
      const { pin, ...staffUpdates } = updates;
      const payload = staffUpdates.phone
        ? { ...staffUpdates, phone: normalizeKenyanPhone(staffUpdates.phone) }
        : staffUpdates;

      const { error } = await supabase
        .from("staff_users")
        .update(payload)
        .eq("id", id);

      if (error) {
        toast.error("Failed to update staff member");
        return false;
      }

      // If a PIN was provided, write it to the linked customers row
      if (pin) {
        const { data: staffMember } = await supabase
          .from("staff_users")
          .select("customer_id")
          .eq("id", id)
          .single();
        if (staffMember?.customer_id) {
          await supabase
            .from("customers")
            .update({ staff_pin: pin } as any)
            .eq("id", staffMember.customer_id);
        }
      }

      setStaff((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...staffUpdates } : s))
      );
      toast.success("Staff member updated");
      return true;
    },
    []
  );

  const toggleStaffStatus = useCallback(
    async (id: string, currentStatus: string) => {
      const newStatus = currentStatus === "active" ? "disabled" : "active";

      // Sync customers.role: disabled staff lose admin access, re-enabled staff regain it
      const { data: staffMember } = await supabase
        .from("staff_users")
        .select("customer_id")
        .eq("id", id)
        .single();

      if (staffMember?.customer_id) {
        await supabase
          .from("customers")
          .update({ role: newStatus === "active" ? "staff" : "customer" } as any)
          .eq("id", staffMember.customer_id);
      }

      return updateStaff(id, { status: newStatus as "active" | "disabled" });
    },
    [updateStaff]
  );

  return { staff, isLoading, fetchStaff, addStaff, updateStaff, toggleStaffStatus };
};
