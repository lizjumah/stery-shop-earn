export interface UserData {
  name: string;
  phone: string;
  email: string;
  address: string;
  loyaltyPoints: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  referralCode: string;
  referralLink: string;
  referredUsers: number;
  referralBonus: number;
  rewardLevel: string;
  nextRewardAt: number;
  ordersSold: number;
}

export interface Voucher {
  id: string;
  title: string;
  description: string;
  pointsCost: number;
  discount: number;
  expiresAt: string;
  isRedeemed: boolean;
}

export interface Earning {
  id: string;
  productName: string;
  amount: number;
  date: string;
  status: "pending" | "paid";
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

export const userData: UserData = {
  name: "Jane Wanjiku",
  phone: "+254 712 345 678",
  email: "jane@email.com",
  address: "Bungoma Town, Western Kenya",
  loyaltyPoints: 85,
  totalEarnings: 4500,
  pendingEarnings: 850,
  paidEarnings: 3650,
  referralCode: "JANE2024",
  referralLink: "https://stery.ke/ref/JANE2024",
  referredUsers: 8,
  referralBonus: 1200,
  rewardLevel: "Silver",
  nextRewardAt: 100,
  ordersSold: 23,
};

export const vouchers: Voucher[] = [
  {
    id: "1",
    title: "KSh 100 Off",
    description: "Get KSh 100 off on orders above KSh 500",
    pointsCost: 100,
    discount: 100,
    expiresAt: "2026-06-30",
    isRedeemed: false,
  },
  {
    id: "2",
    title: "Free Delivery",
    description: "Free delivery on your next order",
    pointsCost: 50,
    discount: 0,
    expiresAt: "2026-05-15",
    isRedeemed: false,
  },
  {
    id: "3",
    title: "KSh 50 Voucher",
    description: "KSh 50 off any purchase",
    pointsCost: 100,
    discount: 50,
    expiresAt: "2026-04-20",
    isRedeemed: true,
  },
];

export const earnings: Earning[] = [
  { id: "1", productName: "Cooking Oil 1L", amount: 40, date: "2026-03-07", status: "paid" },
  { id: "2", productName: "Phone Charger", amount: 100, date: "2026-03-06", status: "paid" },
  { id: "3", productName: "Bracelet", amount: 200, date: "2026-03-05", status: "pending" },
  { id: "4", productName: "Baby Blanket", amount: 120, date: "2026-03-04", status: "pending" },
  { id: "5", productName: "Sugar 1kg", amount: 12, date: "2026-03-03", status: "paid" },
  { id: "6", productName: "Earphones", amount: 60, date: "2026-03-02", status: "paid" },
];

export const orderHistory: Order[] = [
  {
    id: "1",
    orderNumber: "STR-001",
    items: [
      { productId: "1", name: "Stery Bread", quantity: 2, price: 60 },
      { productId: "2", name: "Fresh Milk 500ml", quantity: 1, price: 75 },
    ],
    total: 195,
    status: "delivered",
    date: "2026-03-05",
    deliveryOption: "delivery",
    pointsEarned: 13,
  },
  {
    id: "2",
    orderNumber: "STR-002",
    items: [
      { productId: "4", name: "Cooking Oil 1L", quantity: 1, price: 350 },
      { productId: "3", name: "Sugar 1kg", quantity: 2, price: 180 },
    ],
    total: 710,
    status: "received",
    date: "2026-03-07",
    deliveryOption: "pickup",
    pointsEarned: 44,
  },
  {
    id: "3",
    orderNumber: "STR-003",
    items: [
      { productId: "6", name: "Phone Charger", quantity: 1, price: 500 },
    ],
    total: 500,
    status: "cancelled",
    date: "2026-03-01",
    deliveryOption: "delivery",
    pointsEarned: 0,
  },
];
