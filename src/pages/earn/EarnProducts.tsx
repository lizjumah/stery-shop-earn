import { useState } from "react";
import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

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
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "rounded-full whitespace-nowrap",
                selectedCategory === category && "bg-accent hover:bg-accent/90"
              )}
            >
              {category}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading products…</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-3">{filteredProducts.length} products available</p>
            <div className="grid grid-cols-2 gap-2">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
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
