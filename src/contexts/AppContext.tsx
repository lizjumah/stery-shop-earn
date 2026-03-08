import React, { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { toast } from "sonner";

type AppMode = "shop" | "earn" | null;

interface CartItem {
  productId: string;
  quantity: number;
}

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

interface PlacedOrder {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "delivered" | "cancelled";
  date: string;
  deliveryOption: "delivery" | "pickup";
  pointsEarned: number;
  customerName?: string;
  phone?: string;
  location?: string;
  notes?: string;
  paymentMethod?: string;
  pointsRedeemed?: number;
}

interface PointsHistoryEntry {
  id: string;
  label: string;
  points: number;
  date: string;
  type: "earned" | "redeemed" | "bonus";
}

interface AppContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  cart: CartItem[];
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  setCart: (cart: CartItem[]) => void;
  cartItemCount: number;
  orders: PlacedOrder[];
  placeOrder: (order: PlacedOrder) => void;
  loyaltyPoints: number;
  pointsHistory: PointsHistoryEntry[];
  addPoints: (label: string, points: number, type?: "earned" | "bonus") => void;
  redeemPoints: (points: number, label: string) => boolean;
  birthday: string;
  setBirthday: (date: string) => void;
  birthdayBonusClaimed: boolean;
  generateCartShareCode: () => string;
  loadSharedCart: (code: string) => boolean;
}

// Encode cart as a compact base64 string for URL sharing
const encodeCart = (cart: CartItem[]): string => {
  const data = cart.map((c) => `${c.productId}:${c.quantity}`).join(",");
  return btoa(data);
};

const decodeCart = (code: string): CartItem[] => {
  try {
    const data = atob(code);
    return data.split(",").map((item) => {
      const [productId, qty] = item.split(":");
      return { productId, quantity: parseInt(qty, 10) };
    }).filter((i) => i.productId && !isNaN(i.quantity));
  } catch {
    return [];
  }
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<AppMode>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState(85);
  const [pointsHistory, setPointsHistory] = useState<PointsHistoryEntry[]>([
    { id: "h1", label: "Order STR-001", points: 13, date: "2026-03-05", type: "earned" },
    { id: "h2", label: "Referral Bonus", points: 10, date: "2026-03-03", type: "bonus" },
    { id: "h3", label: "Order STR-002", points: 44, date: "2026-03-07", type: "earned" },
  ]);
  const [birthday, setBirthday] = useState("");
  const [birthdayBonusClaimed, setBirthdayBonusClaimed] = useState(false);
  const [firstOrderBonusGiven, setFirstOrderBonusGiven] = useState(false);

  useEffect(() => {
    if (!birthday || birthdayBonusClaimed) return;
    const today = new Date().toISOString().slice(5, 10);
    const bday = birthday.slice(5, 10);
    if (today === bday) {
      setLoyaltyPoints((p) => p + 50);
      setPointsHistory((h) => [
        { id: `bday-${Date.now()}`, label: "🎂 Birthday Bonus", points: 50, date: new Date().toISOString().split("T")[0], type: "bonus" },
        ...h,
      ]);
      setBirthdayBonusClaimed(true);
      toast.success("🎂 Happy Birthday from Stery! Enjoy 50 bonus points.");
    }
  }, [birthday, birthdayBonusClaimed]);

  const addToCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(productId); return; }
    setCart((prev) => prev.map((item) => item.productId === productId ? { ...item, quantity } : item));
  };

  const clearCart = () => setCart([]);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const addPoints = (label: string, points: number, type: "earned" | "bonus" = "earned") => {
    setLoyaltyPoints((p) => p + points);
    setPointsHistory((h) => [
      { id: `pts-${Date.now()}`, label, points, date: new Date().toISOString().split("T")[0], type },
      ...h,
    ]);
  };

  const redeemPoints = (points: number, label: string): boolean => {
    if (points > loyaltyPoints || points < 50) return false;
    setLoyaltyPoints((p) => p - points);
    setPointsHistory((h) => [
      { id: `red-${Date.now()}`, label, points: -points, date: new Date().toISOString().split("T")[0], type: "redeemed" },
      ...h,
    ]);
    return true;
  };

  const placeOrder = (order: PlacedOrder) => {
    setOrders((prev) => [order, ...prev]);
    const earnedPoints = Math.floor(order.total / 100);
    if (earnedPoints > 0) addPoints(`Order ${order.orderNumber}`, earnedPoints);
    if (order.total >= 2000) addPoints(`Basket Bonus (KSh 2,000+)`, 30, "bonus");
    else if (order.total >= 1000) addPoints(`Basket Bonus (KSh 1,000+)`, 10, "bonus");
    if (!firstOrderBonusGiven && orders.length === 0) {
      addPoints("🎉 First App Order Bonus", 20, "bonus");
      setFirstOrderBonusGiven(true);
      setTimeout(() => toast.success("🎉 Congratulations! You earned 20 bonus points for your first app order."), 500);
    }
  };

  const generateCartShareCode = (): string => encodeCart(cart);

  const loadSharedCart = (code: string): boolean => {
    const items = decodeCart(code);
    if (items.length === 0) return false;
    // Merge shared items into current cart
    setCart((prev) => {
      const merged = [...prev];
      items.forEach((newItem) => {
        const existing = merged.find((m) => m.productId === newItem.productId);
        if (existing) {
          existing.quantity += newItem.quantity;
        } else {
          merged.push({ ...newItem });
        }
      });
      return merged;
    });
    return true;
  };

  return (
    <AppContext.Provider
      value={{
        mode, setMode, cart, setCart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartItemCount,
        orders, placeOrder,
        loyaltyPoints, pointsHistory, addPoints, redeemPoints,
        birthday, setBirthday, birthdayBonusClaimed,
        generateCartShareCode, loadSharedCart,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
