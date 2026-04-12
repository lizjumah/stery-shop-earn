import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { useResellerProducts } from "@/hooks/useResellerProducts";
import { useCustomer } from "@/contexts/CustomerContext";
import { ArrowLeft, Search, Check, Plus, Share2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";

const MyProducts = () => {
  const navigate = useNavigate();
  const { customer } = useCustomer();
  const { data: allProducts = [], isLoading: productsLoading } = useProducts();
  const {
    isLoading: selectionLoading,
    isSelected,
    addProduct,
    removeProduct,
  } = useResellerProducts();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [tab, setTab] = useState<"all" | "mine">("all");

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-foreground font-semibold mb-2">Sign in required</p>
          <p className="text-muted-foreground text-sm">Please sign in to manage your product list.</p>
        </div>
      </div>
    );
  }

  const earnableProducts = allProducts.filter((p) => p.isEarnable === true);
  const categories = ["All", ...Array.from(new Set(earnableProducts.map((p) => p.category))).sort()];

  const baseFiltered = earnableProducts.filter((p) => {
    const matchesCat = selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const displayed =
    tab === "mine" ? baseFiltered.filter((p) => isSelected(p.id)) : baseFiltered;

  // Sort: selected products first within the "all" tab
  const sorted =
    tab === "all"
      ? [...displayed].sort((a, b) => {
          const aSelected = isSelected(a.id) ? 0 : 1;
          const bSelected = isSelected(b.id) ? 0 : 1;
          return aSelected - bSelected;
        })
      : displayed;

  const isLoading = productsLoading || selectionLoading;
  const myCount = earnableProducts.filter((p) => isSelected(p.id)).length;

  const toggle = (productId: string) => {
    if (isSelected(productId)) {
      removeProduct.mutate(productId);
    } else {
      addProduct.mutate(productId);
    }
  };

  const isMutating = (productId: string) =>
    (addProduct.isPending && addProduct.variables === productId) ||
    (removeProduct.isPending && removeProduct.variables === productId);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="gradient-earn px-4 pt-6 pb-5 rounded-b-3xl">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => navigate(-1)} className="bg-white/20 rounded-full p-2">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white text-xl font-bold">My Products</h1>
            <p className="text-white/70 text-xs">
              {myCount > 0
                ? `${myCount} product${myCount !== 1 ? "s" : ""} in your list`
                : "Pick products to promote and earn"}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-1">
          <button
            onClick={() => setTab("all")}
            className={cn(
              "flex-1 py-2 rounded-full text-sm font-semibold transition-colors",
              tab === "all"
                ? "bg-white text-accent"
                : "bg-white/20 text-white"
            )}
          >
            All Earnable
          </button>
          <button
            onClick={() => setTab("mine")}
            className={cn(
              "flex-1 py-2 rounded-full text-sm font-semibold transition-colors",
              tab === "mine"
                ? "bg-white text-accent"
                : "bg-white/20 text-white"
            )}
          >
            My List {myCount > 0 && `(${myCount})`}
          </button>
        </div>
      </div>

      <div className="px-4 mt-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card rounded-full py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent border border-border"
          />
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                selectedCategory === cat
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-foreground border border-border"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Count */}
        {!isLoading && (
          <p className="text-xs text-muted-foreground">
            {tab === "mine" && myCount === 0
              ? "No products in your list yet — add some below."
              : `${sorted.length} product${sorted.length !== 1 ? "s" : ""}`}
          </p>
        )}

        {/* Product list */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-12">Loading…</p>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">
              {tab === "mine"
                ? "You haven't added any products yet."
                : "No products match your search."}
            </p>
            {tab === "mine" && (
              <button
                onClick={() => setTab("all")}
                className="mt-3 text-accent font-semibold text-sm"
              >
                Browse all earnable products
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {sorted.map((product) => {
              const selected = isSelected(product.id);
              const pending = isMutating(product.id);

              return (
                <div
                  key={product.id}
                  className={cn(
                    "bg-card rounded-xl border overflow-hidden transition-colors",
                    selected ? "border-accent/50" : "border-border"
                  )}
                >
                  <div className="flex gap-3 p-3">
                    {/* Image */}
                    <Link to={`/earn/product/${product.id}`} className="shrink-0">
                      <div className="relative w-16 h-16">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                        {selected && (
                          <div className="absolute -top-1.5 -right-1.5 bg-accent rounded-full w-5 h-5 flex items-center justify-center shadow">
                            <Check className="w-3 h-3 text-accent-foreground" />
                          </div>
                        )}
                      </div>
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">
                        {product.name}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>
                      {product.commission ? (
                        <div className="mt-1 inline-flex items-center gap-1 bg-accent/10 rounded-md px-2 py-0.5">
                          <span className="text-accent font-bold text-xs">
                            Earn KSh {product.commission}
                          </span>
                          <span className="text-[10px] text-accent/70">/ sale</span>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-1">KSh {product.price}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {/* Add / Remove toggle */}
                      <button
                        onClick={() => toggle(product.id)}
                        disabled={pending}
                        className={cn(
                          "group flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors",
                          selected
                            ? "bg-accent/10 text-accent border border-accent/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                            : "bg-accent text-accent-foreground hover:bg-accent/90",
                          pending && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {pending ? (
                          "…"
                        ) : selected ? (
                          <>
                            <Check className="w-3 h-3 group-hover:hidden" />
                            <X className="w-3 h-3 hidden group-hover:block" />
                            <span className="group-hover:hidden">Added</span>
                            <span className="hidden group-hover:inline">Remove</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" /> Add
                          </>
                        )}
                      </button>

                      {/* Share shortcut — only when selected */}
                      {selected && (
                        <Link
                          to={`/earn/share/${product.id}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium bg-muted text-foreground hover:bg-muted/80 transition-colors"
                        >
                          <Share2 className="w-3 h-3" /> Share
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyProducts;
