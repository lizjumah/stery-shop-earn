export interface UserData {
  name: string;
  phone: string;
  loyaltyPoints: number;
  totalEarnings: number;
  pendingEarnings: number;
  referralCode: string;
  referralLink: string;
  referredUsers: number;
  referralBonus: number;
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

export const userData: UserData = {
  name: "Jane Wanjiku",
  phone: "+254 712 345 678",
  loyaltyPoints: 1250,
  totalEarnings: 4500,
  pendingEarnings: 850,
  referralCode: "JANE2024",
  referralLink: "https://stery.ke/ref/JANE2024",
  referredUsers: 8,
  referralBonus: 1200,
};

export const vouchers: Voucher[] = [
  {
    id: "1",
    title: "KSh 100 Off",
    description: "Get KSh 100 off on orders above KSh 500",
    pointsCost: 200,
    discount: 100,
    expiresAt: "2024-12-31",
    isRedeemed: false,
  },
  {
    id: "2",
    title: "Free Delivery",
    description: "Free delivery on your next order",
    pointsCost: 150,
    discount: 0,
    expiresAt: "2024-12-15",
    isRedeemed: false,
  },
  {
    id: "3",
    title: "10% Cashback",
    description: "Get 10% cashback on groceries",
    pointsCost: 300,
    discount: 0,
    expiresAt: "2024-12-20",
    isRedeemed: true,
  },
];

export const earnings: Earning[] = [
  { id: "1", productName: "Tea Leaves 500g", amount: 35, date: "2024-01-15", status: "paid" },
  { id: "2", productName: "Cooking Oil 1L", amount: 20, date: "2024-01-14", status: "paid" },
  { id: "3", productName: "Rice 2kg", amount: 18, date: "2024-01-13", status: "pending" },
  { id: "4", productName: "Eggs Tray (30)", amount: 25, date: "2024-01-12", status: "pending" },
  { id: "5", productName: "Sugar 1kg", amount: 12, date: "2024-01-11", status: "paid" },
];
