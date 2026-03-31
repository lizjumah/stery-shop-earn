import { useState, useEffect, useRef } from "react";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import { SHOP_CATEGORIES } from "@/data/categoryConfig";
import { Link, useNavigate } from "react-router-dom";
import { Search, ArrowLeft, X, Clock, TrendingUp, LayoutGrid } from "lucide-react";
import { SteryChat } from "@/components/shop/SteryChat";

// ── Popular search terms ──────────────────────────────────────────────────────
const POPULAR_SEARCHES = [
  "Milk", "Bread", "Sugar", "Cooking Oil", "Rice", "Beer", "Diapers", "Eggs",
];

// ── Recent searches — frontend-only, localStorage ────────────────────────────
const RECENT_KEY = "stery_recent_searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(term: string) {
  if (!term.trim()) return;
  const prev = getRecentSearches().filter(
    (s) => s.toLowerCase() !== term.trim().toLowerCase()
  );
  localStorage.setItem(
    RECENT_KEY,
    JSON.stringify([term.trim(), ...prev].slice(0, MAX_RECENT))
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const ShopHome = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { data: liveProducts = [] } = useProducts();

  // Autofocus + load recents on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches());
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Filter products against current query
  const filteredProducts = searchQuery.trim()
    ? liveProducts.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  // Apply a search term (from suggestion / chip) and save to recents
  const applySearch = (term: string) => {
    saveRecentSearch(term);
    setRecentSearches(getRecentSearches());
    setSearchQuery(term);
    inputRef.current?.focus();
  };

  const clearSearch = () => {
    setSearchQuery("");
    inputRef.current?.focus();
  };

  const removeRecent = (term: string) => {
    const updated = getRecentSearches().filter((s) => s !== term);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    setRecentSearches(updated);
  };

  const quickCategories = SHOP_CATEGORIES.filter((c) => c.isHomepage).slice(0, 8);

  return (
    <div className="min-h-screen bg-background pb-20">

      {/* ── Compact sticky search header ─────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center gap-2 px-3 py-2.5">

          {/* Back to homepage */}
          <button
            onClick={() => navigate("/shop")}
            className="shrink-0 p-1.5 rounded-full hover:bg-muted transition-colors"
            aria-label="Back to shop"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>

          {/* Search input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search products (milk, bread, sugar...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  saveRecentSearch(searchQuery.trim());
                  setRecentSearches(getRecentSearches());
                }
              }}
              className="w-full bg-muted rounded-full py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {searchQuery.length > 0 && (
              <button
                onClick={clearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-border transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Search results ────────────────────────────────────────────────── */}
      {filteredProducts !== null ? (
        <div className="px-4 pt-4">
          {filteredProducts.length > 0 ? (
            <>
              {/* Result count */}
              <p className="text-xs text-muted-foreground mb-3">
                <span className="font-semibold text-foreground">{filteredProducts.length}</span>
                {" "}result{filteredProducts.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
              </p>

              {/* Product grid — reuses existing ProductCard */}
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </>
          ) : (
            /* ── Empty state ───────────────────────────────────────────────── */
            <div className="text-center pt-12 pb-8 px-4">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Search className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground mb-1">
                No results for &ldquo;{searchQuery}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Check the spelling or try a different word
              </p>

              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">
                Try searching for
              </p>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {POPULAR_SEARCHES.map((term) => (
                  <button
                    key={term}
                    onClick={() => applySearch(term)}
                    className="px-3 py-1.5 bg-muted rounded-full text-xs font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>

              <Link
                to="/shop/all-categories"
                className="inline-flex items-center gap-1 text-xs font-medium text-primary"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Browse by Category
              </Link>
            </div>
          )}
        </div>
      ) : (
        /* ── Pre-search landing state ─────────────────────────────────────── */
        <div className="px-4 pt-5 space-y-6">

          {/* Recent searches */}
          {recentSearches.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Recent
                </p>
                <button
                  onClick={() => {
                    localStorage.removeItem(RECENT_KEY);
                    setRecentSearches([]);
                  }}
                  className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {recentSearches.map((term) => (
                  <div
                    key={term}
                    className="flex items-center bg-muted rounded-full overflow-hidden"
                  >
                    <button
                      onClick={() => applySearch(term)}
                      className="pl-3 pr-1.5 py-1.5 text-xs font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {term}
                    </button>
                    <button
                      onClick={() => removeRecent(term)}
                      className="pr-2.5 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`Remove ${term}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Popular at Stery */}
          <section>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mb-2.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Popular at Stery
            </p>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCHES.map((term) => (
                <button
                  key={term}
                  onClick={() => applySearch(term)}
                  className="px-3 py-1.5 bg-card border border-border rounded-full text-xs font-medium text-foreground hover:border-primary/50 hover:text-primary transition-colors card-elevated"
                >
                  {term}
                </button>
              ))}
            </div>
          </section>

          {/* Quick categories */}
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5" />
                Browse by Category
              </p>
              <Link
                to="/shop/all-categories"
                className="text-[11px] text-primary font-medium"
              >
                View all
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickCategories.map((cat) => (
                <Link
                  key={cat.db}
                  to={`/shop/categories?cat=${encodeURIComponent(cat.db)}`}
                  className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary/50 hover:text-primary transition-colors card-elevated"
                >
                  <span className="text-sm leading-none">{cat.emoji}</span>
                  {cat.label}
                </Link>
              ))}
            </div>
          </section>

        </div>
      )}

      <SteryChat />
    </div>
  );
};

export default ShopHome;
