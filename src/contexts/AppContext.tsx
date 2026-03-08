import React, { createContext, useContext, useState, ReactNode } from "react";

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
}

interface AppContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  cart: CartItem[];
  addToCart: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartItemCount: number;
  orders: PlacedOrder[];
  placeOrder: (order: PlacedOrder) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState<AppMode>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);

  const addToCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => setCart([]);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const placeOrder = (order: PlacedOrder) => {
    setOrders((prev) => [order, ...prev]);
  };

  return (
    <AppContext.Provider
      value={{ mode, setMode, cart, addToCart, removeFromCart, updateCartQuantity, clearCart, cartItemCount, orders, placeOrder }}
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
