import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import { useApp } from "@/contexts/AppContext";
import { useCustomer } from "@/contexts/CustomerContext";
import { Button } from "@/components/ui/button";
import { Search, Star, ChevronRight, ShoppingCart } from "lucide-react";
import { SHOP_CATEGORIES } from "@/data/categoryConfig";
import { Link } from "react-router-dom";
import { DailyDealsSection } from "@/components/shop/DailyDealsSection";
import { FreshTodaySection } from "@/components/shop/FreshTodaySection";
import { BuyAgainSection } from "@/components/shop/BuyAgainSection";
import { WeeklyEssentialsSection } from "@/components/shop/WeeklyEssentialsSection";
import { HowItWorksSection } from "@/components/shop/HowItWorksSection";
import { DeliveryInfoSection } from "@/components/shop/DeliveryInfoSection";
import { NeedHelpSection } from "@/components/shop/NeedHelpSection";
import { QuickBundlesSection } from "@/components/shop/QuickBundlesSection";
import { SteryChat } from "@/components/shop/SteryChat";

const POPULAR_SEARCHES = [
  "Milk", "Bread", "Sugar", "Cooking Oil", "Rice", "Beer", "Diapers",
];

const ShopHome = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { cartItemCount } = useApp();
  const { customer } = useCustomer();
  const loyaltyPoints = customer?.loyalty_points || 0;
  const { data: liveProducts = [] } = useProducts();

  const featuredProducts = liveProducts.filter((p) => !p.isOffer).slice(0, 4);
  const offerProducts = liveProducts.filter((p) => p.isOffer);
  const filteredProducts = searchQuery
    ? liveProducts.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-shop px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm">Welcome back,</p>
            <h1 className="text-white text-xl font-bold">{customer?.name?.split(" ")[0] || "there"} 👋</h1>
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground z-10" />
          <input
            type="text"
            placeholder="Search products (milk, bread, sugar...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 150)}
            className="w-full bg-card rounded-full py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />

          {/* Popular searches — shown when focused with empty input */}
          {searchQuery.length === 0 && isFocused && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border shadow-lg overflow-hidden z-50">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-3 pt-3 pb-1.5">
                Popular searches
              </p>
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  onMouseDown={(e) => { e.preventDefault(); setSearchQuery(term); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted transition-colors text-left"
                >
                  <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-sm text-foreground">{term}</span>
                </button>
              ))}
            </div>
          )}

          {/* Live suggestions — shown while typing */}
          {searchQuery.length >= 1 && (() => {
            const suggestions = liveProducts.filter((p) =>
              p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              p.category.toLowerCase().includes(searchQuery.toLowerCase())
            ).slice(0, 8);
            if (suggestions.length > 0) {
              return (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border shadow-lg overflow-hidden z-50">
                  {suggestions.map((p) => (
                    <Link
                      key={p.id}
                      to={`/shop/product/${p.id}`}
                      onClick={() => { setSearchQuery(""); setIsFocused(false); }}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted transition-colors"
                    >
                      <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.category}</p>
                      </div>
                      <span className="text-sm font-bold text-primary shrink-0">KSh {p.price}</span>
                    </Link>
                  ))}
                </div>
              );
            }
            return (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card rounded-xl border border-border shadow-lg z-50 px-3 py-5 text-center">
                <p className="text-sm font-medium text-foreground">No products found</p>
                <p className="text-xs text-muted-foreground mt-1">Try searching for sugar, bread, milk</p>
              </div>
            );
          })()}
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

          {/* Quick Grocery Bundles */}
          <QuickBundlesSection />

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

          {/* 5. Shop by Category */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-foreground">Shop by Category</h2>
            <Link to="/shop/all-categories" className="text-sm text-primary font-medium flex items-center gap-0.5">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
            {SHOP_CATEGORIES.map((cat) => (
              <Link
                key={cat.db}
                to={`/shop/categories?cat=${encodeURIComponent(cat.db)}`}
                className="bg-card rounded-xl p-3 flex flex-col items-center gap-2 card-elevated text-center"
              >
                <span className="text-2xl leading-none">{cat.emoji}</span>
                <span className="text-xs font-medium text-foreground leading-tight">{cat.label}</span>
              </Link>
            ))}
            <Link
              to="/shop/all-categories"
              className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex flex-col items-center gap-2 text-center"
            >
              <span className="text-2xl leading-none">🗂️</span>
              <span className="text-xs font-medium text-primary leading-tight">All Categories</span>
            </Link>
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

      <SteryChat />
    </div>
  );
};

export default ShopHome;
