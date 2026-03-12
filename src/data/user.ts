// Type definitions only — mock data removed.
// All customer, order, and earning data is now fetched from Supabase.

export interface Voucher {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  discount: number;
  expiresAt: string;
  isRedeemed: boolean;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: { productId: string; name: string; quantity: number; price: number }[];
  total: number;
  status: "received" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";
  date: string;
  deliveryOption: "delivery" | "pickup";
  pointsEarned: number;
}
