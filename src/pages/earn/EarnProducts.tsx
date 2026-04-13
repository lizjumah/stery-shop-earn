import { useState } from "react";
import { Link } from "react-router-dom";
import { useProducts } from "@/hooks/useProducts";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { calcCommission } from "@/lib/commission";

const EarnProducts = () => {
  const { data: allProducts = [], isLoading } = useProducts();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Only products explicitly marked earnable by admin
  const earnableProducts = allProducts.filter((p) => p.isEarnable === true);

  // Derive category list from earnable products only
  const categories = ["All", ...Array.from(new Set(earnableProducts.map((p) => p.category))).sort()];

  const filteredProducts = earnableProducts.filter((product) => {
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground mb-4">Products to Sell</h1>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products to sell..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card rounded-full py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent border border-border"
          />
        </div>

        {/* Categories — derived from earnable products */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                selectedCategory === category
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-foreground border border-border"
              )}
            >
              {category}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading products…</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">{filteredProducts.length} products available</p>
            <div className="grid grid-cols-2 gap-2">
              {filteredProducts.map((product) => (
                <Link
                  key={product.id}
                  to={`/earn/product/${product.id}`}
                  className="flex flex-col bg-card rounded-lg overflow-hidden card-elevated"
                >
                  <div className="relative aspect-[3/2] overflow-hidden rounded-t-lg shrink-0">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <span className="absolute top-2 right-2 bg-accent text-accent-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                      Earn KSh {calcCommission(product.price, product.category, product.commission)}
                    </span>
                  </div>
                  <div className="flex flex-col flex-1 px-2.5 pt-1.5 pb-2">
                    <h3 className="font-semibold text-sm line-clamp-2 text-foreground leading-snug">
                      {product.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{product.category}</p>
                    <p className="font-bold text-sm text-foreground mt-auto pt-1.5">KSh {product.price}</p>
                  </div>
                </Link>
              ))}
            </div>
            {filteredProducts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-12">No products found.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EarnProducts;
