import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  delivery_location: string | null;
  delivery_notes: string | null;
  loyalty_points: number;
  birthday: string | null;
  birthday_bonus_claimed: boolean;
}

interface PointsHistoryEntry {
  id: string;
  label: string;
  points: number;
  type: string;
  created_at: string;
}

interface CustomerContextType {
  customer: Customer | null;
  isLoading: boolean;
  pointsHistory: PointsHistoryEntry[];
  loginByPhone: (phone: string) => Promise<Customer | null>;
  createOrLoadCustomer: (data: { name: string; phone: string; email?: string; delivery_location?: string; delivery_notes?: string }) => Promise<Customer | null>;
  updateCustomer: (updates: Partial<Customer>) => Promise<void>;
  addPoints: (label: string, points: number, type?: string) => Promise<void>;
  redeemPoints: (points: number, label: string) => Promise<boolean>;
  logout: () => void;
  refreshCustomer: () => Promise<void>;
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined);

const CUSTOMER_ID_KEY = "stery_customer_id";

export const CustomerProvider = ({ children }: { children: ReactNode }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [pointsHistory, setPointsHistory] = useState<PointsHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPointsHistory = useCallback(async (customerId: string) => {
    const { data } = await supabase
      .from("points_history")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    setPointsHistory(data || []);
  }, []);

  const loadCustomerById = useCallback(async (id: string): Promise<Customer | null> => {
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    const c = data as Customer;
    setCustomer(c);
    await fetchPointsHistory(c.id);
    return c;
  }, [fetchPointsHistory]);

  // On mount, check localStorage for returning user
  useEffect(() => {
    const init = async () => {
      const savedId = localStorage.getItem(CUSTOMER_ID_KEY);
      if (savedId) {
        await loadCustomerById(savedId);
      }
      setIsLoading(false);
    };
    init();
  }, [loadCustomerById]);

  // Birthday bonus check
  useEffect(() => {
    if (!customer || !customer.birthday || customer.birthday_bonus_claimed) return;
    const today = new Date().toISOString().slice(5, 10);
    const bday = customer.birthday.slice(5, 10);
    if (today === bday) {
      addPoints("🎂 Birthday Bonus", 50, "bonus").then(() => {
        supabase.from("customers").update({ birthday_bonus_claimed: true }).eq("id", customer.id).then(() => {
          setCustomer(prev => prev ? { ...prev, birthday_bonus_claimed: true } : null);
        });
        toast.success("🎂 Happy Birthday from Stery! Enjoy 50 bonus points.");
      });
    }
  }, [customer?.id, customer?.birthday, customer?.birthday_bonus_claimed]);

  const loginByPhone = async (phone: string): Promise<Customer | null> => {
    const normalized = phone.replace(/\s+/g, "");
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", normalized)
      .single();
    if (error || !data) return null;
    const c = data as Customer;
    setCustomer(c);
    localStorage.setItem(CUSTOMER_ID_KEY, c.id);
    await fetchPointsHistory(c.id);
    return c;
  };

  const createOrLoadCustomer = async (info: { name: string; phone: string; email?: string; delivery_location?: string; delivery_notes?: string }): Promise<Customer | null> => {
    const normalized = info.phone.replace(/\s+/g, "");

    // Try to find existing
    const { data: existing } = await supabase
      .from("customers")
      .select("*")
      .eq("phone", normalized)
      .single();

    if (existing) {
      const c = existing as Customer;
      // Update name/email/location if provided
      const updates: Record<string, string> = {};
      if (info.name && info.name !== c.name) updates.name = info.name;
      if (info.email && info.email !== c.email) updates.email = info.email;
      if (info.delivery_location) updates.delivery_location = info.delivery_location;
      if (info.delivery_notes) updates.delivery_notes = info.delivery_notes;

      if (Object.keys(updates).length > 0) {
        await supabase.from("customers").update(updates).eq("id", c.id);
        Object.assign(c, updates);
      }

      setCustomer(c);
      localStorage.setItem(CUSTOMER_ID_KEY, c.id);
      await fetchPointsHistory(c.id);
      return c;
    }

    // Create new customer
    const { data: newCustomer, error } = await supabase
      .from("customers")
      .insert({
        name: info.name,
        phone: normalized,
        email: info.email || null,
        delivery_location: info.delivery_location || null,
        delivery_notes: info.delivery_notes || null,
      })
      .select()
      .single();

    if (error || !newCustomer) {
      console.error("Failed to create customer:", error);
      return null;
    }

    const c = newCustomer as Customer;
    setCustomer(c);
    localStorage.setItem(CUSTOMER_ID_KEY, c.id);
    setPointsHistory([]);
    return c;
  };

  const updateCustomer = async (updates: Partial<Customer>) => {
    if (!customer) return;
    const { error } = await supabase.from("customers").update(updates).eq("id", customer.id);
    if (!error) {
      setCustomer(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const addPoints = async (label: string, points: number, type: string = "earned") => {
    if (!customer) return;
    const newTotal = customer.loyalty_points + points;

    await supabase.from("customers").update({ loyalty_points: newTotal }).eq("id", customer.id);
    await supabase.from("points_history").insert({
      customer_id: customer.id,
      label,
      points,
      type,
    });

    setCustomer(prev => prev ? { ...prev, loyalty_points: newTotal } : null);
    await fetchPointsHistory(customer.id);
  };

  const redeemPoints = async (points: number, label: string): Promise<boolean> => {
    if (!customer || points > customer.loyalty_points || points < 50) return false;
    const newTotal = customer.loyalty_points - points;

    await supabase.from("customers").update({ loyalty_points: newTotal }).eq("id", customer.id);
    await supabase.from("points_history").insert({
      customer_id: customer.id,
      label,
      points: -points,
      type: "redeemed",
    });

    setCustomer(prev => prev ? { ...prev, loyalty_points: newTotal } : null);
    await fetchPointsHistory(customer.id);
    return true;
  };

  const logout = () => {
    setCustomer(null);
    setPointsHistory([]);
    localStorage.removeItem(CUSTOMER_ID_KEY);
  };

  const refreshCustomer = async () => {
    if (customer) {
      await loadCustomerById(customer.id);
    }
  };

  return (
    <CustomerContext.Provider value={{
      customer,
      isLoading,
      pointsHistory,
      loginByPhone,
      createOrLoadCustomer,
      updateCustomer,
      addPoints,
      redeemPoints,
      logout,
      refreshCustomer,
    }}>
      {children}
    </CustomerContext.Provider>
  );
};

export const useCustomer = () => {
  const context = useContext(CustomerContext);
  if (!context) throw new Error("useCustomer must be used within CustomerProvider");
  return context;
};
