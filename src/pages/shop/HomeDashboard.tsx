import { useState, useRef, useEffect, useMemo } from "react";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useApp } from "@/contexts/AppContext";
import { useCustomer } from "@/contexts/CustomerContext";
import { useProducts } from "@/hooks/useProducts";
import { useBuyAgain } from "@/hooks/useBuyAgain";
import { usePopularProducts } from "@/hooks/usePopularProducts";
import { Product, subcategoryConfig } from "@/data/products";
import { SHOP_CATEGORIES } from "@/data/categoryConfig";
import { ProductCard } from "@/components/ProductCard";
import { Progress } from "@/components/ui/progress";
import {
  Search, ShoppingCart, Star, Gift, ChevronRight, ChevronDown,
  Phone, RefreshCw, UserCircle, TrendingUp, MessageCircle, LayoutGrid, PackagePlus,
} from "lucide-react";
import steryLogo from "@/assets/stery-logo.png.png";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Business contact — update here when number changes */
const STERY_PHONE = "0794560657";
const STERY_PHONE_DISPLAY = "0794560657";

const NEXT_REWARD_AT = 100;

/** Quick-access chips — all homepage-priority categories */
const CHIP_CATEGORIES = SHOP_CATEGORIES.filter((c) => c.isHomepage);

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
    <div className="mb-8">
      <div className="flex items-center justify-between px-4 mb-2.5">
        <h2 className="font-semibold text-foreground text-sm tracking-wide">{title}</h2>
        <Link to={seeAllPath} className="text-xs text-primary font-medium flex items-center gap-0.5 opacity-80 hover:opacity-100 transition-opacity">
          See all <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {products.slice(0, 10).map((p) => (
          <div key={p.id} className="w-36 lg:w-44 shrink-0">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </div>
  );
};

const HomeDashboard = () => {
  const { cartItemCount, addToCart } = useApp();
  const { customer } = useCustomer();
  const navigate = useNavigate();
  const { data: liveProducts = [] } = useProducts();

  const [browseOpen, setBrowseOpen] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const browseRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!browseOpen) return;
    const handler = (e: MouseEvent) => {
      if (browseRef.current && !browseRef.current.contains(e.target as Node)) {
        setBrowseOpen(false);
        setExpandedCat(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [browseOpen]);

  const firstName = customer?.name?.split(" ")[0] || null;
  const loyaltyPoints = customer?.loyalty_points || 0;
  const pointsToNext = Math.max(0, NEXT_REWARD_AT - (loyaltyPoints % NEXT_REWARD_AT));
  const progress = ((loyaltyPoints % NEXT_REWARD_AT) / NEXT_REWARD_AT) * 100;

  const buyAgainProducts  = useBuyAgain(customer?.id);
  const { isInstallable, isInstalled } = usePWAInstall();
  const showIPhoneCard = useMemo(() => {
    const isIOS =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return (
      !isInstallable &&
      !isInstalled &&
      !window.matchMedia("(display-mode: standalone)").matches &&
      isIOS
    );
  }, [isInstallable, isInstalled]);

  const handleAddAllBuyAgain = () => {
    buyAgainProducts.forEach((p) => addToCart(p.id));
    toast(`${buyAgainProducts.length} item${buyAgainProducts.length !== 1 ? "s" : ""} added to cart.`, {
      action: { label: "View Cart", onClick: () => navigate("/shop/cart") },
    });
  };

  // const dealProducts = liveProducts.filter((p) => p.isOffer || p.originalPrice); // disabled with Today's Deals shelf
  const popularProducts   = usePopularProducts(liveProducts, 8);
  const groceryProducts   = liveProducts.filter((p) => (p.category === "Groceries" || p.category === "Bakery") && p.image && p.image.trim() !== "");
  const householdProducts = liveProducts.filter((p) => (p.category === "Household & Cleaning" || p.category === "Electronics") && p.image && p.image.trim() !== "");
  const specialtyProducts = liveProducts.filter((p) => (p.category === "Baby Items" || p.category === "Jewelry") && p.image && p.image.trim() !== "");
  // New Arrivals: most recently added, only products with images
  const newProducts       = [...liveProducts].reverse().filter((p) => p.image && p.image.trim() !== "").slice(0, 4);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-6">

      {/* ── Sticky storefront header ── */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">

        {/* Utility row — secondary actions */}
        <div className="flex items-center justify-between px-4 py-1 bg-muted/40 border-b border-border/40">
          <a
            href={`tel:${STERY_PHONE}`}
            className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <Phone className="w-2.5 h-2.5" />
            <span>{STERY_PHONE_DISPLAY}</span>
          </a>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/shop/orders")}
              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold px-4 py-2 rounded-full transition-colors"
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

        {/* Main header row — logo / search / browse-dropdown / cart */}
        <div className="flex items-center gap-2 px-4 py-3">

          {/* Logo — hidden on desktop (sidebar already shows it) */}
          <Link to="/shop" className="shrink-0 flex items-center lg:hidden">
            <img src={steryLogo} alt="Stery Supermarket" className="h-11 w-auto object-contain" />
          </Link>

          {/* Search tap-target */}
          <Link to="/shop/browse" className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <div className="w-full bg-muted rounded-full py-2.5 pl-9 pr-4 text-muted-foreground text-sm select-none">
              Search products...
            </div>
          </Link>

          {/* Browse Categories dropdown */}
          <div ref={browseRef} className="relative shrink-0">
            <button
              onClick={() => setBrowseOpen((v) => !v)}
              className="flex items-center gap-1 px-2.5 py-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
              aria-label="Browse categories"
              aria-expanded={browseOpen}
            >
              <LayoutGrid className="w-4 h-4 text-foreground" />
              <span className="hidden sm:inline text-xs font-medium text-foreground whitespace-nowrap">
                Browse
              </span>
              <ChevronDown
                className={cn(
                  "w-3.5 h-3.5 text-muted-foreground transition-transform duration-150",
                  browseOpen && "rotate-180"
                )}
              />
            </button>

            {/* Dropdown panel */}
            {browseOpen && (
              <div
                className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50
                  w-64 sm:w-auto sm:flex sm:flex-row"
              >
                {/* ── Left column: category list (always visible) ── */}
                <div className="sm:w-52 flex flex-col">
                  <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
                    Categories
                  </p>
                  <div className="pb-1 overflow-y-auto max-h-[70vh]">
                    {SHOP_CATEGORIES.map((cat) => {
                      const subs = (subcategoryConfig[cat.db] ?? [])
                        .filter((s) => s !== "General")
                        .slice(0, 10);
                      const isExpanded = expandedCat === cat.db;
                      return (
                        <div key={cat.db}>
                          {/* Category row */}
                          <div
                            className={cn(
                              "flex items-center transition-colors",
                              isExpanded ? "bg-muted" : "hover:bg-muted"
                            )}
                            onMouseEnter={() => subs.length > 0 && setExpandedCat(cat.db)}
                          >
                            <Link
                              to={`/shop/categories?cat=${encodeURIComponent(cat.db)}`}
                              onClick={() => { setBrowseOpen(false); setExpandedCat(null); }}
                              className="flex items-center gap-2.5 px-3 py-2 flex-1 min-w-0"
                            >
                              <span className="text-base leading-none shrink-0">{cat.emoji}</span>
                              <span className="text-sm text-foreground truncate">{cat.label}</span>
                            </Link>
                            {subs.length > 0 && (
                              <button
                                onClick={() => setExpandedCat(isExpanded ? null : cat.db)}
                                className="px-2.5 py-2 text-muted-foreground hover:text-foreground"
                                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${cat.label}`}
                              >
                                {/* On desktop: solid right-arrow; on mobile: rotate to point down when open */}
                                <ChevronRight className={cn(
                                  "w-3.5 h-3.5 transition-transform duration-150",
                                  "sm:rotate-0",
                                  isExpanded && "rotate-90 sm:rotate-0"
                                )} />
                              </button>
                            )}
                          </div>

                          {/* Mobile accordion (hidden on sm+) */}
                          {isExpanded && subs.length > 0 && (
                            <div className="sm:hidden bg-muted/50 border-t border-b border-border/40">
                              {subs.map((sub) => (
                                <Link
                                  key={sub}
                                  to={`/shop/categories?cat=${encodeURIComponent(cat.db)}&sub=${encodeURIComponent(sub)}`}
                                  onClick={() => { setBrowseOpen(false); setExpandedCat(null); }}
                                  className="flex items-center px-9 py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                                >
                                  {sub}
                                </Link>
                              ))}
                              <Link
                                to={`/shop/categories?cat=${encodeURIComponent(cat.db)}`}
                                onClick={() => { setBrowseOpen(false); setExpandedCat(null); }}
                                className="flex items-center gap-1 px-9 py-1.5 text-xs font-semibold text-primary hover:bg-muted transition-colors"
                              >
                                View all {cat.label} <ChevronRight className="w-3 h-3" />
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    <div className="border-t border-border mt-1 pt-1">
                      <Link
                        to="/shop/all-categories"
                        onClick={() => { setBrowseOpen(false); setExpandedCat(null); }}
                        className="flex items-center justify-between px-3 py-2 hover:bg-muted transition-colors"
                      >
                        <span className="text-sm font-semibold text-primary">View all</span>
                        <ChevronRight className="w-3.5 h-3.5 text-primary" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* ── Right column: subcategories (desktop only) ── */}
                {expandedCat && (() => {
                  const cat = SHOP_CATEGORIES.find((c) => c.db === expandedCat);
                  const subs = (subcategoryConfig[expandedCat] ?? []).filter((s) => s !== "General").slice(0, 10);
                  if (!cat || subs.length === 0) return null;
                  return (
                    <div
                      className="hidden sm:flex flex-col w-44 border-l border-border bg-muted/30"
                      onMouseLeave={() => setExpandedCat(null)}
                    >
                      <p className="px-3 pt-2.5 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0">
                        {cat.label}
                      </p>
                      <div className="pb-1 overflow-y-auto flex-1">
                        {subs.map((sub) => (
                          <Link
                            key={sub}
                            to={`/shop/categories?cat=${encodeURIComponent(cat.db)}&sub=${encodeURIComponent(sub)}`}
                            onClick={() => { setBrowseOpen(false); setExpandedCat(null); }}
                            className="flex items-center px-3 py-2 text-xs text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                          >
                            {sub}
                          </Link>
                        ))}
                        <Link
                          to={`/shop/categories?cat=${encodeURIComponent(cat.db)}`}
                          onClick={() => { setBrowseOpen(false); setExpandedCat(null); }}
                          className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-primary hover:bg-muted transition-colors border-t border-border/40 mt-1"
                        >
                          View all {cat.label} <ChevronRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Cart */}
          <Link
            to="/shop/cart"
            className="relative shrink-0 p-2 rounded-full bg-muted hover:bg-muted/80 transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-foreground" />
            {cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ── Store identity band ── */}
      <div className="px-4 py-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground text-sm">Stery Supermarket</span>
          <span className="text-muted-foreground/50 text-xs">·</span>
          <span className="text-muted-foreground text-xs">Bungoma</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {firstName
            ? `Welcome back, ${firstName} 👋`
            : "Fresh groceries, bakery, electronics & more"}
        </p>
      </div>


      {/* ── iOS install card ── */}
      {showIPhoneCard && (
        <div className="mx-4 mt-3 mb-1 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
          <p className="text-sm font-semibold text-orange-900 mb-0.5">Get Stery on your phone 📱</p>
          <p className="text-xs text-orange-800 leading-relaxed">
            Open this in Safari, tap the <span className="font-semibold">Share</span> button, then choose{" "}
            <span className="font-semibold">Add to Home Screen</span>.
          </p>
        </div>
      )}

      {/* ── Category chips ── */}
      <div className="sticky top-[96px] lg:top-[56px] z-30 bg-background border-b border-border shadow-sm">
        <div className="flex gap-1.5 overflow-x-auto px-4 py-2 scrollbar-hide">
          {CHIP_CATEGORIES.map((cat) => (
            <Link
              key={cat.db}
              to={`/shop/categories?cat=${encodeURIComponent(cat.db)}`}
              className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5 shrink-0 card-elevated"
            >
              <span className="text-sm">{cat.emoji}</span>
              <span className="text-xs font-medium text-foreground whitespace-nowrap">{cat.label}</span>
            </Link>
          ))}
          <Link
            to="/shop/all-categories"
            className="flex items-center gap-1 px-3 py-1.5 shrink-0 text-xs font-medium text-primary whitespace-nowrap"
          >
            View all <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* ── Buy Again ── */}
      {buyAgainProducts.length > 0 && (
        <div className="mt-5 mb-8">
          <div className="flex items-center justify-between px-4 mb-2.5">
            <h2 className="font-semibold text-foreground text-sm tracking-wide">🔁 Buy Again</h2>
            <button
              onClick={handleAddAllBuyAgain}
              className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <PackagePlus className="w-3 h-3" />
              Add All
            </button>
          </div>
          <div className="flex gap-2.5 overflow-x-auto px-4 pb-2 scrollbar-hide">
            {buyAgainProducts.map((p) => (
              <div key={p.id} className="w-36 lg:w-44 shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Today's Deals shelf ── (temporarily disabled — re-enable when deal IDs are updated to Supabase UUIDs)
      <div className={buyAgainProducts.length > 0 ? "" : "mt-4"}>
        <ProductShelf
          title="🔥 Today's Deals"
          products={dealProducts}
          seeAllPath="/shop/offers"
        />
      </div>
      */}

      {/* ── Popular Products shelf ── */}
      <ProductShelf
        title="⭐ Popular Products"
        products={popularProducts}
        seeAllPath="/shop/browse"
      />

      {/* ── Earn with Stery banner ── */}
      <div className="mx-4 mb-8">
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

      {/* ── Category product shelves ── */}
      <ProductShelf
        title="🛒 Fresh & Groceries"
        products={groceryProducts}
        seeAllPath="/shop/categories?cat=Groceries"
      />

      <ProductShelf
        title="🏠 Household & Electronics"
        products={householdProducts}
        seeAllPath="/shop/categories?cat=Household+%26+Cleaning"
      />

      <ProductShelf
        title="✨ More from Stery"
        products={specialtyProducts}
        seeAllPath="/shop/categories"
      />

      {/* ── New Arrivals — 2-col grid ── */}
      {newProducts.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between px-4 mb-2.5">
            <h2 className="font-semibold text-foreground text-sm tracking-wide">🆕 New Arrivals</h2>
            <Link to="/shop/browse" className="text-xs text-primary font-medium flex items-center gap-0.5 opacity-80 hover:opacity-100 transition-opacity">
              See all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 px-4">
            {newProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* ── Contact / support block ── */}
      <div className="mx-4 mb-6 bg-card rounded-xl p-4 border border-border/60 card-elevated">
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
      <div className="mx-4 mb-8 bg-card rounded-xl p-4 border border-primary/15 card-elevated">
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
