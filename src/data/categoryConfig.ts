/**
 * Official Stery category list — single source of truth for storefront display.
 * db:          exact category value stored in Supabase (never change these)
 * label:       display name shown in UI
 * emoji:       icon shown in category cards
 * isHomepage:  true → shown in the homepage "Shop by Category" grid
 *              false → shown only on /shop/all-categories
 */
export const SHOP_CATEGORIES = [
  // ── Homepage priority (shown on /shop in this order) ─────────────────
  { db: "Food & Grocery",         label: "Groceries",              emoji: "🥫", isHomepage: true  },
  { db: "Beverages",              label: "Beverages",              emoji: "🥤", isHomepage: true  },
  { db: "Household & Cleaning",   label: "Household",              emoji: "🧹", isHomepage: true  },
  { db: "Personal Care",          label: "Personal Care & Beauty", emoji: "🧴", isHomepage: true  },
  { db: "Baby Items",             label: "Baby & Kids",            emoji: "👶", isHomepage: true  },
  { db: "Snacks & Confectionery", label: "Snacks",                 emoji: "🍪", isHomepage: true  },
  { db: "Wines & Spirits",        label: "Wines & Spirits",        emoji: "🍷", isHomepage: true  },
  { db: "Bakery",                 label: "Bakery",                 emoji: "🍞", isHomepage: true  },
  // ── All Categories page only ──────────────────────────────────────────
  { db: "Kitchen & Utensils",     label: "Kitchen",                emoji: "🍳", isHomepage: false },
  { db: "Stationery & School",    label: "Stationery",             emoji: "📚", isHomepage: false },
  { db: "Fashion & Accessories",  label: "Fashion",                emoji: "👗", isHomepage: false },
  { db: "Footwear",               label: "Footwear",               emoji: "👟", isHomepage: false },
  { db: "Shoes",                  label: "Shoes",                  emoji: "👞", isHomepage: false },
  { db: "Electronics",            label: "Electronics",            emoji: "⚡", isHomepage: false },
];
