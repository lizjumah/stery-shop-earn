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

export type OrderStatus =
  | "received"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

interface PlacedOrder {
  id: string;
  orderNumber: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  date: string;
  deliveryOption: "delivery" | "pickup";
  pointsEarned: number;
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
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  loyaltyPoints: number;
  pointsHistory: PointsHistoryEntry[];
  addPoints: (label: string, points: number) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {

  // FIX: mode now persists after refresh
  const [modeState, setModeState] = useState<AppMode>(() => {
    const saved = localStorage.getItem("stery_mode");

    if (saved === "shop" || saved === "earn") {
      return saved;
    }

    return null;
  });

  const setMode = (mode: AppMode) => {
    setModeState(mode);

    if (mode) {
      localStorage.setItem("stery_mode", mode);
    } else {
      localStorage.removeItem("stery_mode");
    }
  };

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<PlacedOrder[]>([]);
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [pointsHistory, setPointsHistory] = useState<PointsHistoryEntry[]>([]);

  const addToCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === productId);

      if (existing) {
        return prev.map(i =>
          i.productId === productId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }

      return [...prev,{ productId, quantity:1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev =>
      prev.filter(i => i.productId !== productId)
    );
  };

  const updateCartQuantity = (
    productId: string,
    quantity: number
  ) => {

    if(quantity <=0){
      removeFromCart(productId);
      return;
    }

    setCart(prev =>
      prev.map(i =>
        i.productId === productId
          ? { ...i, quantity }
          : i
      )
    );
  };

  const clearCart = () => setCart([]);

  const cartItemCount = cart.reduce(
    (sum,i)=> sum + i.quantity,
    0
  );

  const addPoints = (label:string,points:number)=>{
    setLoyaltyPoints(p=>p+points);

    setPointsHistory(h=>[
      {
        id:Date.now().toString(),
        label,
        points,
        date:new Date().toISOString(),
        type:"earned"
      },
      ...h
    ]);
  };

  const placeOrder = (order:PlacedOrder)=>{
    setOrders(prev=>[order,...prev]);

    const earned = Math.floor(order.total/100);

    if(earned>0){
      addPoints(
        `Order ${order.orderNumber}`,
        earned
      );
    }
  };

  const updateOrderStatus = (
    orderId:string,
    status:OrderStatus
  )=>{
    setOrders(prev=>
      prev.map(o=>
        o.id===orderId
          ? {...o,status}
          : o
      )
    );
  };

  return(

    <AppContext.Provider

      value={{

        mode:modeState,

        setMode,

        cart,

        setCart,

        addToCart,

        removeFromCart,

        updateCartQuantity,

        clearCart,

        cartItemCount,

        orders,

        placeOrder,

        updateOrderStatus,

        loyaltyPoints,

        pointsHistory,

        addPoints

      }}

    >

      {children}

    </AppContext.Provider>

  );

};

export const useApp=()=>{

  const context=useContext(AppContext);

  if(!context){
    throw new Error("useApp must be used inside provider");
  }

  return context;

};