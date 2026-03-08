import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { products, categories } from "@/data/products";
import { ProductCard } from "@/components/ProductCard";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

const Categories = () => {
  const [searchParams] = useSearchParams();
  const initialCat = searchParams.get("cat") || "All";
  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [searchQuery, setSearchQuery] = useState("");
  const [offersOnly, setOffersOnly] = useState(false);

  useEffect(() => {
    const cat = searchParams.get("cat");
    if (cat) setSelectedCategory(cat);
  }, [searchParams]);

  const filteredProducts = products.filter((product) => {
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOffers = !offersOnly || product.isOffer;
    return matchesCategory && matchesSearch && matchesOffers;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-xl font-bold text-foreground mb-4">All Products</h1>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card rounded-full py-3 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary border border-border"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className={cn(
                "rounded-full whitespace-nowrap",
                selectedCategory === category && "bg-primary"
              )}
            >
              {category}
            </Button>
          ))}
        </div>

        {/* Offers toggle */}
        <button
          onClick={() => setOffersOnly(!offersOnly)}
          className={cn(
            "text-sm rounded-full px-3 py-1 border mb-4",
            offersOnly ? "bg-destructive text-destructive-foreground border-destructive" : "border-border text-muted-foreground"
          )}
        >
          🔥 Offers only
        </button>

        {/* Products */}
        <p className="text-sm text-muted-foreground mb-3">{filteredProducts.length} products</p>
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Categories;
