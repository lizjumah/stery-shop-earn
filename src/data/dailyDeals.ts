// Daily deals configuration - easy to update by store admin
// These rotate based on the day of the week

export interface DailyDeal {
  productId: string;
  specialPrice?: number; // Optional special price for today only
  featured?: boolean;
}

// Configure deals for each day (0 = Sunday, 1 = Monday, etc.)
const dailyDealsConfig: Record<number, DailyDeal[]> = {
  0: [ // Sunday - Family day
    { productId: "1", featured: true }, // Stery Bread
    { productId: "2" }, // Fresh Milk
    { productId: "8" }, // Baby Blanket
  ],
  1: [ // Monday - Fresh start
    { productId: "1", featured: true }, // Stery Bread
    { productId: "2" }, // Fresh Milk
    { productId: "14" }, // Eggs
  ],
  2: [ // Tuesday - Essentials
    { productId: "3" }, // Sugar
    { productId: "4", featured: true }, // Cooking Oil
    { productId: "11" }, // Unga
  ],
  3: [ // Wednesday - Mid-week deals
    { productId: "1", featured: true }, // Stery Bread
    { productId: "12" }, // Tea Leaves
    { productId: "13" }, // Rice
  ],
  4: [ // Thursday - Electronics day
    { productId: "6", featured: true }, // Phone Charger
    { productId: "7" }, // Earphones
    { productId: "1" }, // Stery Bread
  ],
  5: [ // Friday - Weekend prep
    { productId: "4", featured: true }, // Cooking Oil
    { productId: "3" }, // Sugar
    { productId: "14" }, // Eggs
  ],
  6: [ // Saturday - Special day
    { productId: "8", featured: true }, // Baby Blanket
    { productId: "9" }, // Bracelet
    { productId: "1" }, // Stery Bread
  ],
};

// Featured promotion banners
export const promotionBanners = [
  {
    id: "bakery",
    title: "Fresh from Stery Bakery 🍞",
    subtitle: "Baked fresh every morning",
    gradient: "from-amber-600 to-amber-500",
  },
  {
    id: "essentials",
    title: "Essential Groceries 🛒",
    subtitle: "Stock up on household basics",
    gradient: "from-primary to-emerald-500",
  },
  {
    id: "electronics",
    title: "Tech Deals ⚡",
    subtitle: "Quality electronics at great prices",
    gradient: "from-blue-600 to-blue-500",
  },
];

// Get today's deals
export const getTodayDeals = (): DailyDeal[] => {
  const today = new Date().getDay();
  return dailyDealsConfig[today] || dailyDealsConfig[1]; // Default to Monday's deals
};

// Check if a product is in today's deals
export const isTodayDeal = (productId: string): boolean => {
  const todayDeals = getTodayDeals();
  return todayDeals.some((deal) => deal.productId === productId);
};

// Get greeting based on time of day
export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};
