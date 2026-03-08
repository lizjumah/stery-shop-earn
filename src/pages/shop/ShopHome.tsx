import { useState } from "react";
import { products, categories } from "@/data/products";
import { userData } from "@/data/user";
import { ProductCard } from "@/components/ProductCard";
import { BottomNav } from "@/components/BottomNav";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Search, Star, ChevronRight, ShoppingCart, ShoppingBag, Zap, Baby, Home as HomeIcon, Gem } from "lucide-react";
import { Link } from "react-router-dom";
import { DailyDealsSection } from "@/components/shop/DailyDealsSection";
import { FreshTodaySection } from "@/components/shop/FreshTodaySection";
import { BuyAgainSection } from "@/components/shop/BuyAgainSection";
import { WeeklyEssentialsSection } from "@/components/shop/WeeklyEssentialsSection";
import { HowItWorksSection } from "@/components/shop/HowItWorksSection";
import { DeliveryInfoSection } from "@/components/shop/DeliveryInfoSection";
import { NeedHelpSection } from "@/components/shop/NeedHelpSection";
import { QuickBundlesSection } from "@/components/shop/QuickBundlesSection";

const categoryIcons: Record<string, React.ReactNode> = {
  Groceries: <ShoppingBag className="w-5 h-5" />,
  Bakery: <span className="text-lg">🍞</span>,
  Electronics: <Zap className="w-5 h-5" />,
  "Baby Items": <Baby className="w-5 h-5" />,
  Household: <HomeIcon className="w-5 h-5" />,
  Jewelry: <Gem className="w-5 h-5" />,
};

const ShopHome = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const { cartItemCount, loyaltyPoints } = useApp();

  const featuredProducts = products.filter((p) => !p.isOffer).slice(0, 4);
  const offerProducts = products.filter((p) => p.isOffer);
  const filteredProducts = searchQuery
    ? products.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-shop px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm">Welcome back,</p>
            <h1 className="text-white text-xl font-bold">{userData.name.split(" ")[0]} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/shop/rewards" className="bg-white/20 rounded-full px-3 py-2 flex items-center gap-1.5">
              <Star className="w-4 h-4 text-white fill-white" />
              <span className="text-white font-semibold text-sm">{loyaltyPoints}</span>
            </Link>
            <Link to="/shop/cart" className="bg-white/20 rounded-full p-2 relative">
              <ShoppingCart className="w-5 h-5 text-white" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card rounded-full py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Search results */}
      {filteredProducts ? (
        <div className="px-4 mt-6">
          <h2 className="text-lg font-bold text-foreground mb-4">
            Search Results ({filteredProducts.length})
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      ) : (
        <div className="px-4 mt-6">
          {/* 1. Daily Deals */}
          <DailyDealsSection />

          {/* 2. Fresh Today from Stery Bakery */}
          <FreshTodaySection />

          {/* 3. Buy Again */}
          <BuyAgainSection />

          {/* 4. Weekly Essentials */}
          <WeeklyEssentialsSection />

          {/* Hot Deals Banner */}
          <Link to="/shop/offers">
            <div className="bg-gradient-to-r from-destructive to-orange-500 rounded-xl p-4 flex items-center justify-between mb-6">
              <div>
                <p className="text-white font-bold text-lg">Today's Hot Deals! 🔥</p>
                <p className="text-white/80 text-sm">Up to 30% off selected items</p>
              </div>
              <ChevronRight className="w-6 h-6 text-white" />
            </div>
          </Link>

          {/* 5. Categories */}
          <h2 className="text-lg font-bold text-foreground mb-3">Categories</h2>
          <div className="grid grid-cols-3 gap-3 mb-6">
            {categories.filter((c) => c !== "All").map((cat) => (
              <Link
                key={cat}
                to={`/shop/categories?cat=${encodeURIComponent(cat)}`}
                className="bg-card rounded-xl p-3 flex flex-col items-center gap-2 card-elevated"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  {categoryIcons[cat] || <ShoppingBag className="w-5 h-5" />}
                </div>
                <span className="text-xs font-medium text-foreground">{cat}</span>
              </Link>
            ))}
          </div>

          {/* Loyalty Summary */}
          <div className="bg-card rounded-xl p-4 card-elevated mb-6 border border-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Your Stery Points</p>
                <p className="text-2xl font-bold text-foreground">{loyaltyPoints} pts</p>
                <p className="text-xs text-primary mt-0.5">
                  {loyaltyPoints >= 50
                    ? `✅ You can redeem up to KSh ${loyaltyPoints} at checkout`
                    : `${50 - loyaltyPoints} more to start redeeming`}
                </p>
              </div>
              <Link to="/shop/rewards">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  View Rewards
                </Button>
              </Link>
            </div>
          </div>

          {/* Special Offers */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground">Special Offers</h2>
            <Link to="/shop/offers" className="text-sm text-primary font-medium">See All</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {offerProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* 6. All Products / Top Essentials */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground">Top Essentials</h2>
            <Link to="/shop/categories" className="text-sm text-primary font-medium">See All</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Info sections */}
          <HowItWorksSection />
          <DeliveryInfoSection />
          <NeedHelpSection />
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default ShopHome;
