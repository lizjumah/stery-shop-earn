import { useApp } from "@/contexts/AppContext";
import { useCustomer } from "@/contexts/CustomerContext";
import { useProducts } from "@/hooks/useProducts";
import { Product } from "@/data/products";
import { SHOP_CATEGORIES } from "@/data/categoryConfig";
import { ProductCard } from "@/components/ProductCard";
import { Progress } from "@/components/ui/progress";
import {
  Search, ShoppingCart, Star, Gift, ChevronRight,
  Phone, RefreshCw, UserCircle, TrendingUp, MessageCircle, LayoutGrid,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

/** Business contact — update here when number changes */
const STERY_PHONE = "0794560657";
const STERY_PHONE_DISPLAY = "0794560657";

const NEXT_REWARD_AT = 100;

/** Quick-access chips shown in the horizontal scroll strip */
const CHIP_CATEGORIES = SHOP_CATEGORIES.filter((c) => c.isHomepage && c.db !== "Bakery");

/** Horizontal scrolling product shelf */
const ProductShelf = ({
  title,
  products,
  seeAllPath,
}: {
  title: string;
  products: Product[];
  seeAllPath: string;
}) => {
  if (!products.length) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="font-bold text-foreground text-base">{title}</h2>
        <Link to={seeAllPath} className="text-xs text-primary font-medium flex items-center gap-0.5">
          See all <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 pb-1 scrollbar-hide">
        {products.slice(0, 6).map((p) => (
          <div key={p.id} className="w-36 shrink-0">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
};

const HomeDashboard = () => {
  const { cartItemCount } = useApp();
  const { customer } = useCustomer();
  const navigate = useNavigate();
  const { data: liveProducts = [] } = useProducts();

  const firstName = customer?.name?.split(" ")[0] || null;
  const loyaltyPoints = customer?.loyalty_points || 0;
  const pointsToNext = Math.max(0, NEXT_REWARD_AT - (loyaltyPoints % NEXT_REWARD_AT));
  const progress = ((loyaltyPoints % NEXT_REWARD_AT) / NEXT_REWARD_AT) * 100;

  const dealProducts      = liveProducts.filter((p) => p.isOffer || p.originalPrice);
  const popularProducts   = liveProducts.filter((p) => p.inStock !== false).slice(0, 8);
  const groceryProducts   = liveProducts.filter((p) => p.category === "Groceries" || p.category === "Bakery");
  const householdProducts = liveProducts.filter((p) => p.category === "Household" || p.category === "Electronics");
  const specialtyProducts = liveProducts.filter((p) => p.category === "Baby Items" || p.category === "Jewelry");
  const newProducts       = [...liveProducts].reverse().slice(0, 4);

  return (
    <div className="min-h-screen bg-background pb-20">

      {/* ── Sticky storefront header ── */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">

        {/* Utility row — phone / reorder / sign-in */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-muted/60 border-b border-border/60">
          <a
            href={`tel:${STERY_PHONE}`}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-accent transition-colors"
          >
            <Phone className="w-3 h-3" />
            <span>{STERY_PHONE_DISPLAY}</span>
          </a>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/shop/orders")}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reorder</span>
            </button>

            {customer ? (
              <Link
                to="/profile"
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
              >
                <UserCircle className="w-3 h-3" />
                <span>{firstName}</span>
              </Link>
            ) : (
              <Link
                to="/profile"
                className="flex items-center gap-1 text-[11px] text-primary font-semibold"
              >
                <UserCircle className="w-3 h-3" />
                <span>Sign in</span>
              </Link>
            )}
          </div>
        </div>

        {/* Main header row — logo / search / cart */}
        <div className="flex items-center gap-3 px-4 py-3">
          {/* Stery wordmark */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-black text-base leading-none">S</span>
            </div>
            <div className="leading-none">
              <span className="font-black text-foreground text-sm tracking-tight block">Stery</span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-wider block">Supermarket</span>
            </div>
          </div>

          {/* Search bar — taps through to /shop/browse where real search + suggestions live */}
          <Link to="/shop/browse" className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <div className="w-full bg-muted rounded-full py-2.5 pl-9 pr-4 text-muted-foreground text-sm select-none">
              Search products (milk, bread, sugar...)
            </div>
          </Link>

          {/* Categories entry point */}
          <Link
            to="/shop/all-categories"
            className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 shrink-0"
          >
            <LayoutGrid className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary whitespace-nowrap">Categories</span>
          </Link>

          {/* Cart */}
          <Link to="/shop/cart" className="relative shrink-0">
            <ShoppingCart className="w-6 h-6 text-foreground" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ── Store identity band ── */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-baseline gap-1.5">
          <span className="font-bold text-foreground text-sm">Stery Supermarket</span>
          <span className="text-muted-foreground text-sm">· Bungoma</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {firstName
            ? `Welcome back, ${firstName} 👋 — what are you shopping for today?`
            : "Fresh groceries, bakery, electronics & household essentials"}
        </p>
      </div>

      {/* ── Delivery / trust strip ── */}
      <div className="px-4 py-1.5 bg-primary/5 border-b border-primary/10 flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <span className="text-[11px] text-primary font-semibold whitespace-nowrap">🚚 Delivery in Bungoma Town</span>
        <span className="text-border select-none">·</span>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">Same-day pickup available</span>
        <span className="text-border select-none">·</span>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">M-Pesa accepted</span>
      </div>

      {/* ── 1. Quick category chips — fixed priority list, horizontal scroll ── */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
        {CHIP_CATEGORIES.map((cat) => (
          <Link
            key={cat.db}
            to={`/shop/categories?cat=${encodeURIComponent(cat.db)}`}
            className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2 shrink-0 card-elevated"
          >
            <span className="text-base">{cat.emoji}</span>
            <span className="text-sm font-medium text-foreground whitespace-nowrap">{cat.label}</span>
          </Link>
        ))}
      </div>

      {/* ── 2. Shop by Category grid ── */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-foreground text-base">Shop by Category</h2>
          <Link to="/shop/all-categories" className="text-xs text-primary font-medium flex items-center gap-0.5">
            View All <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile (1-col): horizontal list row. Tablet (2-col) / Desktop (3-col): vertical tile. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SHOP_CATEGORIES.filter((c) => c.isHomepage).map((cat) => (
            <Link
              key={cat.db}
              to={`/shop/categories?cat=${encodeURIComponent(cat.db)}`}
              className="bg-card rounded-xl card-elevated flex items-center gap-3 px-4 py-3
                         sm:flex-col sm:items-center sm:justify-center sm:px-3 sm:py-4 sm:gap-2 sm:text-center"
            >
              <span className="text-2xl leading-none shrink-0">{cat.emoji}</span>
              <span className="text-sm font-medium text-foreground leading-tight sm:text-[11px]">
                {cat.label}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto sm:hidden" />
            </Link>
          ))}
          {/* All Categories card */}
          <Link
            to="/shop/all-categories"
            className="bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3 px-4 py-3
                       sm:flex-col sm:items-center sm:justify-center sm:px-3 sm:py-4 sm:gap-2 sm:text-center"
          >
            <span className="text-2xl leading-none shrink-0">📂</span>
            <span className="text-sm font-semibold text-primary leading-tight sm:text-[11px]">
              All Categories
            </span>
            <ChevronRight className="w-4 h-4 text-primary ml-auto sm:hidden" />
          </Link>
        </div>
      </div>

      {/* ── 3. Today's Deals shelf ── */}
      <ProductShelf
        title="🔥 Today's Deals"
        products={dealProducts}
        seeAllPath="/shop/offers"
      />

      {/* ── 4. Popular Products shelf ── */}
      <ProductShelf
        title="⭐ Popular Products"
        products={popularProducts}
        seeAllPath="/shop/browse"
      />

      {/* ── Earn with Stery banner ── */}
      <div className="mx-4 mb-6">
        <div className="gradient-earn rounded-2xl p-5 flex items-center gap-4 card-elevated">
          <div className="bg-white/20 rounded-full p-3 shrink-0">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base leading-tight">Earn with Stery</p>
            <p className="text-white/80 text-xs mt-0.5 leading-snug">
              Share products &amp; earn commission on every sale
            </p>
          </div>
          <Link
            to="/earn"
            className="shrink-0 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold rounded-full px-3 py-1.5 flex items-center gap-1 transition-colors"
          >
            Start Earning <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── 5. Category product shelves ── */}
      <ProductShelf
        title="🛒 Fresh & Groceries"
        products={groceryProducts}
        seeAllPath="/shop/categories?cat=Groceries"
      />

      <ProductShelf
        title="🏠 Household & Electronics"
        products={householdProducts}
        seeAllPath="/shop/categories?cat=Household"
      />

      <ProductShelf
        title="✨ More from Stery"
        products={specialtyProducts}
        seeAllPath="/shop/categories"
      />

      {/* ── New Arrivals — 2-col grid ── */}
      {newProducts.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <h2 className="font-bold text-foreground text-base">🆕 New Arrivals</h2>
            <Link to="/shop/browse" className="text-xs text-primary font-medium flex items-center gap-0.5">
              See all <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 px-4">
            {newProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* ── Contact / support block ── */}
      <div className="mx-4 mb-4 bg-card rounded-xl p-4 border border-border card-elevated">
        <p className="text-xs font-semibold text-foreground mb-2.5">Need help? We're here for you</p>
        <div className="flex gap-2">
          <a href={`tel:${STERY_PHONE}`} className="flex-1">
            <button className="w-full flex items-center justify-center gap-1.5 bg-secondary hover:bg-secondary/80 rounded-lg py-2.5 text-xs font-medium text-foreground transition-colors">
              <Phone className="w-3.5 h-3.5" /> Call Stery
            </button>
          </a>
          <a
            href={`https://wa.me/${STERY_PHONE.replace("+", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1"
          >
            <button className="w-full flex items-center justify-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg py-2.5 text-xs font-medium transition-colors">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </button>
          </a>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          Order online · Pay on pickup · M-Pesa accepted
        </p>
      </div>

      {/* ── Rewards strip ── */}
      <div className="mx-4 mb-6 bg-card rounded-xl p-4 border border-primary/20 card-elevated">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary fill-primary" />
            <span className="font-bold text-sm text-foreground">{loyaltyPoints} loyalty points</span>
          </div>
          <Link to="/shop/rewards" className="flex items-center gap-1 text-xs text-primary font-medium">
            <Gift className="w-3.5 h-3.5" />
            Redeem
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
        <Progress value={progress} className="h-1.5" />
        <p className="text-xs text-muted-foreground mt-1.5">
          {pointsToNext} more points to your next voucher
        </p>
      </div>

    </div>
  );
};

export default HomeDashboard;
