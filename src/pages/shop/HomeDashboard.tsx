import { useApp } from "@/contexts/AppContext";
import { useCustomer } from "@/contexts/CustomerContext";
import { useProducts } from "@/hooks/useProducts";
import { categories, categoryConfig, Product } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { Progress } from "@/components/ui/progress";
import {
  Search, ShoppingCart, Star, Gift, ChevronRight,
  Phone, RefreshCw, UserCircle, TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

/** Business contact — update here when number changes */
const STERY_PHONE = "+254712426918";
const STERY_PHONE_DISPLAY = "+254 712 426 918";

const NEXT_REWARD_AT = 100;

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
  const { data: liveProducts = [] } = useProducts();

  const firstName = customer?.name?.split(" ")[0] || null;
  const loyaltyPoints = customer?.loyalty_points || 0;
  const pointsToNext = Math.max(0, NEXT_REWARD_AT - (loyaltyPoints % NEXT_REWARD_AT));
  const progress = ((loyaltyPoints % NEXT_REWARD_AT) / NEXT_REWARD_AT) * 100;

  const dealProducts       = liveProducts.filter((p) => p.isOffer || p.originalPrice);
  const popularProducts    = liveProducts.filter((p) => p.inStock !== false).slice(0, 8);
  const groceryProducts    = liveProducts.filter((p) => p.category === "Groceries" || p.category === "Bakery");
  const householdProducts  = liveProducts.filter((p) => p.category === "Household" || p.category === "Electronics");
  const specialtyProducts  = liveProducts.filter((p) => p.category === "Baby Items" || p.category === "Jewelry");
  const newProducts        = [...liveProducts].reverse().slice(0, 4);

  return (
    <div className="min-h-screen bg-background pb-20">

      {/* ── Sticky storefront header ── */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">

        {/* Utility row — phone / reorder / sign-in */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-muted/60 border-b border-border/60">
          {/* Business phone */}
          <a
            href={`https://wa.me/${STERY_PHONE.replace("+", "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-accent transition-colors"
          >
            <Phone className="w-3 h-3" />
            <span>{STERY_PHONE_DISPLAY}</span>
          </a>

          <div className="flex items-center gap-3">
            {/* Reorder — links to order history (real flow) */}
            <Link
              to="/shop/orders"
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reorder</span>
            </Link>

            {/* Sign in / profile */}
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
          {/* Logo */}
          <div className="w-9 h-9 rounded-xl gradient-shop flex items-center justify-center shrink-0">
            <span className="text-white font-black text-lg leading-none">S</span>
          </div>

          {/* Search bar — taps through to /shop/browse where real search + suggestions live */}
          <Link to="/shop/browse" className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <div className="w-full bg-muted rounded-full py-2.5 pl-9 pr-4 text-muted-foreground text-sm select-none">
              Search products at Stery…
            </div>
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

      {/* ── Greeting band ── */}
      <div className="gradient-shop px-4 py-2.5">
        <p className="text-white/90 text-sm font-medium">
          {firstName
            ? `Hey ${firstName} 👋 — what are you shopping for today?`
            : "Welcome to Stery 👋 — your local supermarket"}
        </p>
      </div>

      {/* ── Category chips — structured from categoryConfig ── */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
        {categories.filter((c) => c !== "All").map((cat) => {
          const cfg = categoryConfig[cat];
          return (
            <Link
              key={cat}
              to={`/shop/categories?cat=${encodeURIComponent(cat)}`}
              className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5 shrink-0 card-elevated"
            >
              <span className="text-sm">{cfg?.emoji ?? "🏪"}</span>
              <span className="text-xs font-medium text-foreground whitespace-nowrap">{cfg?.label ?? cat}</span>
            </Link>
          );
        })}
        <Link
          to="/shop/categories"
          className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1.5 shrink-0"
        >
          <span className="text-xs font-medium text-primary whitespace-nowrap">All categories</span>
        </Link>
      </div>

      {/* ── Today's Deals shelf ── */}
      <ProductShelf
        title="🔥 Today's Deals"
        products={dealProducts}
        seeAllPath="/shop/offers"
      />

      {/* ── Popular Products shelf ── */}
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

      {/* ── Fresh & Groceries shelf ── */}
      <ProductShelf
        title="🛒 Fresh & Groceries"
        products={groceryProducts}
        seeAllPath="/shop/categories?cat=Groceries"
      />

      {/* ── Household & Electronics shelf ── */}
      <ProductShelf
        title="🏠 Household & Electronics"
        products={householdProducts}
        seeAllPath="/shop/categories?cat=Household"
      />

      {/* ── Specialty shelf (Baby, Jewelry) ── */}
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

      {/* ── Rewards strip — compact, below all products ── */}
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
